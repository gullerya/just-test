/**
 * This will launch browser environment, that is:
 * - launching browser main instance
 * - loading session runner
 * - tracking test run instances and collecting data (coverage, logs)
 * - dismissing all upon finalization / crash
 * 
 * @param {Object} envConfig environment configuration
 * @param {string} envConfig.browser in this context expected always to equal true
 */
import Logger, { FileOutput } from '../../logger/logger.js';
import { waitInterval } from '../../../common/time-utils.js';
import { config as serverConfig } from '../../server-service.ts';
import { collectTargetSources, v8toJustTest } from '../../../coverage/coverage-service.js';
import { EnvironmentBase } from '../environment-base.js';
import { ENVIRONMENT_KEYS } from '../../../runner/environment-config.js';
import { normalizeCoverageUrl } from '../../../coverage/model/url-utils.js';
import playwright from 'playwright';

export default launch;

const logger = new Logger({ context: 'browser env service' });

const SESSION_COVERAGE_ID = '__session__';

class BrowserEnvImpl extends EnvironmentBase {
	#envConfig;
	#timeoutHandle;
	#browser;
	#browsingContext;

	#coverageTargets = null;
	//	per-test coverage collected as pages are closed; also holds a
	//	`SESSION_COVERAGE_ID` bucket for pages without a test-id (main page,
	//	iframe/worker mode where there is no 1:1 test-to-page mapping)
	#coverageByTestId = new Map();
	//	pages still tracked for coverage; drained at dismiss. in page mode
	//	per-test keying proved unreliable (race between navigation and
	//	startJSCoverage even with route-gating for child pages), so we
	//	bucket everything into SESSION_COVERAGE_ID and report the union
	#openCoverPages = new Set();
	//	per-page promise that resolves once startJSCoverage has landed; the
	//	context-level route interceptor awaits this before letting the first
	//	document request through, eliminating the race between page creation
	//	and coverage setup (so V8 actually tracks the scripts that load)
	#coverageReady = new Map();

	/**
	 * construct browser environment for a specific session
	 *
	 * @param {string} sessionId session ID
	 * @param {object} envConfig environment setup
	 */
	constructor(sessionId, envConfig) {
		super(sessionId);

		this.#envConfig = envConfig;

		this.consoleLogger = null;
		this.dismissPromise = null;

		Object.seal(this);
	}

	async launch() {
		const browserType = this.#envConfig.browser.type;
		logger.info(`launching '${browserType}' environment...`);

		this.#browser = await playwright[browserType].launch();
		this.#browser.once('disconnected', () => this.#onDisconnected());

		this.consoleLogger = new FileOutput(`./reports/logs/${browserType}-${this.#browser.version()}.log`);
		const pageLogger = new Logger({
			context: `${browserType}-${this.#browser.version()}`,
			outputs: [this.consoleLogger]
		});

		this.#browsingContext = await this.#browser.newContext();
		//	gate the first request on CHILD pages on coverage setup so V8
		//	has tracking enabled before any script executes (the `page`
		//	listener is async and otherwise races window.open navigation).
		//	the main page is set up explicitly below so doesn't need this.
		if (this.#envConfig.coverage) {
			await this.#browsingContext.route('**/*', async route => {
				const req = route.request();
				//	navigation requests have no frame yet and carry no JS
				//	the browser will track — let them through unthrottled.
				//	subsequent resource requests (scripts, XHR) belong to
				//	a real frame and we gate those on coverage setup.
				if (!req.isNavigationRequest()) {
					try {
						const page = req.frame().page();
						const pending = this.#coverageReady.get(page);
						if (pending) {
							this.#coverageReady.delete(page);
							await pending;
						}
					} catch {
						//	frame gone / page closed mid-flight; continue
					}
				}
				await route.continue();
			});
		}
		this.#browsingContext.on('page', page => {
			//	register the coverage-ready promise SYNCHRONOUSLY so the
			//	route interceptor can find it when the first request fires
			this.#coverageReady.set(page, this.#setupPage(page, pageLogger));
		});

		logger.info(`setting timeout for the whole tests execution to ${this.#envConfig.tests.ttl}ms as per configuration`);
		this.#timeoutHandle = setTimeout(() => {
			logger.error('tests execution timed out, dismissing the environment...');
			this.#notifyError(new Error(`environment timed out ${this.#envConfig.tests.ttl}ms`));
		}, this.#envConfig.tests.ttl);

		const mainPage = await this.#browsingContext.newPage();
		//	ensure the main page's coverage setup has landed BEFORE the
		//	navigation kicks off. the 'page' listener above has already
		//	run (synchronously, during newPage) and stored the promise;
		//	awaiting it here also avoids any lingering race where `goto`'s
		//	first request could hit the route handler before the listener
		//	has added the entry.
		if (this.#coverageReady.has(mainPage)) {
			await this.#coverageReady.get(mainPage);
		}
		const envEntryUrl = new URL(`${serverConfig.origin}/core/runner/environments/browser/browser-session-box.html`);
		envEntryUrl.searchParams.append(ENVIRONMENT_KEYS.SESSION_ID, this.sessionId);
		envEntryUrl.searchParams.append(ENVIRONMENT_KEYS.ENVIRONMENT_ID, this.#envConfig.id);
		logger.info(`navigating testing environment to '${envEntryUrl}'...`);
		await mainPage.goto(envEntryUrl.toString());
	}

	async dismiss() {
		if (!this.dismissPromise) {
			this.dismissPromise = waitInterval(999)
				.then(async () => {
					await this.consoleLogger.close();
					const artifacts = await this.#collectArtifacts();

					logger.info('closing browsing context...');
					await this.#browsingContext.close();
					logger.info('... closed');

					logger.info('closing browser...');
					await this.#browser.close();
					logger.info('... closed');

					return artifacts;
				});
		}
		return this.dismissPromise;
	}

	async #setupPage(page, pageLogger) {
		const self = this;
		if (this.#envConfig.coverage) {
			await this.#initCoverage(page);
		}
		page.on('console', async msg => {
			const type = msg.type();
			for (const msgArg of msg.args()) {
				try {
					const consoleMessage = await msgArg.evaluate(o => o);
					pageLogger[type](consoleMessage);
				} catch {
					//	page closed / navigated away before the arg could be
					//	serialized; common in page-per-test mode and not an
					//	actual failure — drop the message
				}
			}
		});
		page.on('crash', () => {
			pageLogger.error('"crash" event fired on page');
			pageLogger.info('dismissing the environment due to previous error/s...');
			self.#notifyError(null);
		});
		page.on('pageerror', e => {
			pageLogger.error('"pageerror" event fired on page:');
			pageLogger.error(e);
			pageLogger.info('dismissing the environment due to previous error/s...');
			self.#notifyError(e);
		});
	}

	#notifyError(error) {
		this.dispatchEvent(new CustomEvent('error', { detail: { error } }));
	}

	async #initCoverage(page) {
		if (!this.#coverageTargets) {
			this.#coverageTargets = await collectTargetSources(this.#envConfig.coverage) ?? [];
		}
		if (!this.#coverageTargets.length) {
			logger.info('no coverage targets found, skipping coverage collection');
			return;
		}
		await page.coverage.startJSCoverage();
		this.#openCoverPages.add(page);
		//	per-test browser coverage is not reliable across executor modes
		//	(iframe/worker share a host, page mode races navigation); merge
		//	every page's coverage into a single session-global bucket and let
		//	the lcov output reflect the union of what the session executed
		page.on('close', async () => {
			if (!this.#openCoverPages.has(page)) {
				return;
			}
			this.#openCoverPages.delete(page);
			try {
				const fileCovs = await this.#stopAndConvert(page);
				if (fileCovs.length) {
					this.#appendCoverage(SESSION_COVERAGE_ID, fileCovs);
				}
			} catch (e) {
				logger.warn(`failed to collect coverage on page close: ${e?.message ?? e}`);
			}
		});
		logger.info(`started coverage collection for ${this.#coverageTargets.length} targets`);
	}

	async #stopAndConvert(page) {
		const jsCoverage = await page.coverage.stopJSCoverage();
		const filtered = jsCoverage
			.filter(entry => this.#coverageTargets.some(t => entry.url.endsWith(t)))
			.map(entry => ({
				url: normalizeCoverageUrl(entry.url.replace(`${serverConfig.origin}/static/`, './')),
				functions: entry.functions
			}));
		return filtered.length ? await v8toJustTest(filtered) : [];
	}

	#appendCoverage(testId, fileCovs) {
		const existing = this.#coverageByTestId.get(testId);
		if (existing) {
			existing.push(...fileCovs);
		} else {
			this.#coverageByTestId.set(testId, fileCovs);
		}
	}

	#onDisconnected() {
		clearTimeout(this.#timeoutHandle);
		logger.info(`browser environment '${this.#envConfig.id}' disconnected`);
		this.dispatchEvent(new CustomEvent('dismissed'));
	}

	async #collectArtifacts() {
		await this.#drainOpenCoverPages();
		return { coverage: this.#coverageByTestId };
	}

	async #drainOpenCoverPages() {
		//	pages still open at dismiss (typically the main session-box
		//	page, and any iframe/worker host) are flushed here into the
		//	session-global bucket
		const pending = [...this.#openCoverPages];
		this.#openCoverPages.clear();
		for (const page of pending) {
			try {
				const fileCovs = await this.#stopAndConvert(page);
				if (fileCovs.length) {
					this.#appendCoverage(SESSION_COVERAGE_ID, fileCovs);
				}
			} catch (e) {
				logger.warn(`failed to flush coverage at dismiss: ${e?.message ?? e}`);
			}
		}
	}
}

/**
 * launches managed browsing environment and executes tests in it
 * - TODO: consider to separate auto-run
 * 
 * @param {string} sessionId 
 * @param {object} envConfig 
 * @returns environment
 */
async function launch(sessionId, envConfig) {
	if (!envConfig || !envConfig.browser) {
		throw new Error(`env configuration expected to have browser set to some value; got ${JSON.stringify(envConfig)}`);
	}

	const result = new BrowserEnvImpl(sessionId, envConfig);
	await result.launch();
	return result;
}