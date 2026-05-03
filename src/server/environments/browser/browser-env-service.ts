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
import Logger from '../../../logging/logger.ts';
import FileOutput from '../../../logging/file-output.ts';
import { config as serverConfig } from '../../server-service.ts';
import { filterV8Coverage } from '../../../coverage/coverage-service.ts';
import { EnvironmentBase } from '../environment-base.ts';
import { ENVIRONMENT_KEYS } from '../../../runner/environment-config.ts';
import { normalizeCoverageUrl } from '../../../coverage/model/url-utils.ts';
import playwright from 'playwright';

export default launch;

const logger = new Logger({ context: 'browser env service' });

class BrowserEnvImpl extends EnvironmentBase {
	#envConfig;
	#timeoutHandle;
	#browser;
	#browsingContext;

	consoleLogger: any = null;
	dismissPromise: Promise<any> | null = null;

	//	ref-count active start/stop brackets per page. iframe mode runs
	//	many overlapping tests that all share the main page's V8 — we
	//	start on the first overlapping call and stop only when the last
	//	test on that page ends, returning the union as that last test's
	//	coverage (session-global attribution, honest trade-off).
	//	page mode has one bracket per (per-test) page so count stays 0→1→0.
	#pageCoverage = new WeakMap();

	/**
	 * construct browser environment for a specific session
	 *
	 * @param {string} sessionId session ID
	 * @param {object} envConfig environment setup
	 */
	constructor(sessionId, envConfig) {
		super(sessionId);

		this.#envConfig = envConfig;

		Object.seal(this);
	}

	async launch() {
		const browserType = this.#envConfig.browser.type;
		logger.info(`launching '${browserType}' environment...`);

		this.#browser = await playwright[browserType].launch();
		this.#browser.once('disconnected', () => this.#onDisconnected());

		this.consoleLogger = new FileOutput(`./reports/logs/${browserType}-${this.#browser.version()}.log`);
		//	page console lines arrive already fully formatted (timestamp +
		//	level + context) from the runner-side Logger in the session-box;
		//	re-wrapping them via another Logger would double-prefix every
		//	line. Dumb-pipe to the file sink + server console instead. Only
		//	"crash" / "pageerror" signals (which originate in Playwright, not
		//	the runner) get a real Logger so they pick up a server prefix.
		const pageErrLogger = new Logger({
			context: `${browserType}-${this.#browser.version()}`,
			outputs: [this.consoleLogger, console]
		});
		const pageSinks = [this.consoleLogger, console];

		this.#browsingContext = await this.#browser.newContext();

		if (this.#envConfig.coverage) {
			await this.#exposeCoverageBindings();
		}

		this.#browsingContext.on('page', async page => {
			await this.#setupPage(page, pageSinks, pageErrLogger);
		});

		logger.info(`setting timeout for the whole tests execution to ${this.#envConfig.tests.ttl}ms as per configuration`);
		this.#timeoutHandle = setTimeout(() => {
			logger.error('tests execution timed out, dismissing the environment...');
			this.#notifyError(new Error(`environment timed out ${this.#envConfig.tests.ttl}ms`));
		}, this.#envConfig.tests.ttl);

		const mainPage = await this.#browsingContext.newPage();
		const envEntryUrl = new URL(`${serverConfig.origin}/core/runner/environments/browser/browser-session-box.html`);
		envEntryUrl.searchParams.append(ENVIRONMENT_KEYS.SESSION_ID, this.sessionId);
		envEntryUrl.searchParams.append(ENVIRONMENT_KEYS.ENVIRONMENT_ID, this.#envConfig.id);
		logger.info(`navigating testing environment to '${envEntryUrl}'...`);
		await mainPage.goto(envEntryUrl.toString());
	}

	async dismiss() {
		if (!this.dismissPromise) {
			this.dismissPromise = (async () => {
				await this.consoleLogger.close();

				logger.info('closing browsing context...');
				await this.#browsingContext.close();
				logger.info('... closed');

				logger.info('closing browser...');
				await this.#browser.close();
				logger.info('... closed');
			})();
		}
		return this.dismissPromise;
	}

	async #setupPage(page, pageSinks, pageErrLogger) {
		page.on('console', async msg => {
			const type = msg.type();
			const method = type === 'warning' ? 'warn' : type;
			for (const msgArg of msg.args()) {
				try {
					const consoleMessage = await msgArg.evaluate(o => o);
					if (typeof consoleMessage !== 'string') {
						//	non-string values coming from the page haven't been
						//	formatted by a Logger; fall back to the error-side
						//	logger so the server attaches a proper prefix
						pageErrLogger[method]?.(consoleMessage);
						continue;
					}
					for (const sink of pageSinks) {
						sink[method]?.(consoleMessage);
					}
				} catch {
					//	page closed / navigated away before the arg could be
					//	serialized; common in page-per-test mode and not an
					//	actual failure — drop the message
				}
			}
		});
		page.on('crash', () => {
			pageErrLogger.error('"crash" event fired on page');
			pageErrLogger.info('dismissing the environment due to previous error/s...');
			this.#notifyError(null);
		});
		page.on('pageerror', e => {
			pageErrLogger.error('"pageerror" event fired on page:');
			pageErrLogger.error(e);
			pageErrLogger.info('dismissing the environment due to previous error/s...');
			this.#notifyError(e);
		});
	}

	#notifyError(error) {
		this.dispatchEvent(new CustomEvent('error', { detail: { error } }));
	}

	async #exposeCoverageBindings() {
		//	both bindings are keyed on `source.page` so each page gets its
		//	own start/stop lifecycle — iframe mode binds to the main page
		//	(iframes share V8 with their host), page mode binds to the
		//	per-test child page. workers have no `window` so they install
		//	local no-op shims on their own global; no binding reaches them.
		//	Playwright delivers binding calls concurrently, so the naive
		//	`read count -> await -> set count` pattern races in iframe mode
		//	(multiple tests overlap on the host page). Serialize per-page
		//	bracket transitions via a promise chain held in `#pageLock`.
		const coverageInclude: string[] = this.#envConfig.coverage?.include ?? [];

		await this.#browsingContext.exposeBinding('__jtStartCoverage', async ({ page }) => {
			if (!coverageInclude.length) {
				return;
			}
			await this.#serialize(page, async () => {
				const count = this.#pageCoverage.get(page) ?? 0;
				if (count === 0) {
					await page.coverage.startJSCoverage();
				}
				this.#pageCoverage.set(page, count + 1);
			});
		});

		await this.#browsingContext.exposeBinding('__jtStopCoverage', async ({ page }) => {
			return this.#serialize(page, async () => {
				const count = this.#pageCoverage.get(page) ?? 0;
				if (count === 0) {
					return [];
				}
				if (count > 1) {
					//	another overlapping test on the same page (iframe mode)
					//	is still running — don't stop v8 yet, and don't return
					//	partial data to this caller either. coverage lands on
					//	the last test on this page.
					this.#pageCoverage.set(page, count - 1);
					return [];
				}
				this.#pageCoverage.delete(page);
				const jsCoverage = await page.coverage.stopJSCoverage();
				//	strip the server origin + /static/ prefix so URLs match the
				//	`./src/**` style of the user's `coverage.include` patterns;
				//	from here on the data is raw V8 (just with canonical URLs)
				//	and flows unchanged to the host where conversion happens.
				const normalized = jsCoverage.map(entry => ({
					url: normalizeCoverageUrl(entry.url.replace(`${serverConfig.origin}/static/`, './')),
					functions: entry.functions
				}));
				return filterV8Coverage(normalized, coverageInclude);
			});
		});
	}

	#pageLock = new WeakMap();
	async #serialize(page, task) {
		const prev = this.#pageLock.get(page) ?? Promise.resolve();
		const next = prev.then(task, task);
		this.#pageLock.set(page, next.catch(() => {}));
		return next;
	}

	#onDisconnected() {
		clearTimeout(this.#timeoutHandle);
		logger.info(`browser environment '${this.#envConfig.id}' disconnected`);
		this.dispatchEvent(new CustomEvent('dismissed'));
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
