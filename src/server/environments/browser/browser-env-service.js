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
import { config as serverConfig } from '../../server-service.js';
import { collectTargetSources, v8toJustTest } from '../../../coverage/coverage-service.js';
import { EnvironmentBase } from '../environment-base.js';
import { ENVIRONMENT_KEYS } from '../../../runner/environment-config.js';
import playwright from 'playwright';

export default launch;

const logger = new Logger({ context: 'browser env service' });

class BrowserEnvImpl extends EnvironmentBase {
	#envConfig;
	#timeoutHandle;
	#browser;
	#browsingContext;
	#coverageData = [];

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
		this.#browsingContext.on('page', async page => {
			await this.#setupPage(page, pageLogger);
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
			await this.#initCoverage(this.#envConfig.coverage, page);
		}
		page.on('console', async msg => {
			const type = msg.type();
			for (const msgArg of msg.args()) {
				const consoleMessage = await msgArg.evaluate(o => o);
				pageLogger[type](consoleMessage);
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

	async #initCoverage(coverageConfig, page) {
		const coverageTargets = await collectTargetSources(coverageConfig);
		if (!coverageTargets || !coverageTargets.length) {
			logger.info('no coverage targets found, skipping coverage collection');
		} else {
			this.#coverageData.push({
				page,
				targets: coverageTargets
			});
			await page.coverage.startJSCoverage();
			logger.info(`started coverage collection for ${coverageTargets.length} targets`);

			await page.exposeBinding('collectCoverage', async ({ page: p }) => {
				const jsCoverage = await p.coverage.stopJSCoverage();
				const prepCov = jsCoverage
					.filter(entry => coverageTargets.some(t => entry.url.endsWith(t)))
					.map(entry => {
						return {
							url: entry.url.replace(`${serverConfig.origin}/static/`, './'),
							functions: entry.functions
						};
					});
				return await v8toJustTest(prepCov);
			});
		}
	}

	#onDisconnected() {
		clearTimeout(this.#timeoutHandle);
		logger.info(`browser environment '${this.#envConfig.id}' disconnected`);
		this.dispatchEvent(new CustomEvent('dismissed'));
	}

	async #collectArtifacts() {
		const [coverage] = await Promise.all([
			this.#collectCoverage()
		]);
		return { coverage };
	}

	async #collectCoverage() {
		// const result = [];
		// for (const pageCovBucket of this.#coverageData) {
		// 	const page = pageCovBucket.page;
		// 	delete pageCovBucket.page;
		// 	const jsCoverage = await page.coverage.stopJSCoverage();
		// 	result.push(...jsCoverage
		// 		.filter(entry => pageCovBucket.targets.some(t => entry.url.endsWith(t)))
		// 		.map(entry => {
		// 			return {
		// 				url: entry.url.replace(`${serverConfig.origin}/static/`, './'),
		// 				functions: entry.functions
		// 			};
		// 		})
		// 	);
		// }
		// return await v8toJustTest(result);
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