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
import { INTEROP_NAMES } from '../../../common/constants.js';
import { waitInterval } from '../../../common/time-utils.js';
import { config as serverConfig } from '../../server-service.js';
import { collectTargetSources } from '../../../coverage/coverage-service.js';
import { EnvironmentBase } from '../environment-base.js';
import playwright from 'playwright';
import { ENVIRONMENT_KEYS } from '../../../runner/environment-config.js';

export default launch;

const logger = new Logger({ context: 'browser env service' });

class BrowserEnvImpl extends EnvironmentBase {
	#envConfig;
	#timeoutHandle;
	#browser;
	#browsingContext;
	#coverageSession;
	#scriptsCoverageMap;

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

		this.consoleLogger = new FileOutput(`./reports/logs/${browserType}-${this.#browser.version()}.log`);
		const bLogger = new Logger({
			context: `${browserType}-${this.#browser.version()}`,
			outputs: [this.consoleLogger]
		});

		this.#browsingContext = await this.#browser.newContext();
		const mainPage = await this.#browsingContext.newPage();

		mainPage.on('console', async msg => {
			const type = msg.type();
			for (const msgArg of msg.args()) {
				const consoleMessage = await msgArg.evaluate(o => o);
				bLogger[type](consoleMessage);
			}
		});
		mainPage.on('error', e => {
			bLogger.error('"error" event fired on page', e);
		});
		mainPage.on('pageerror', e => {
			bLogger.error('"pageerror" event fired on page:');
			bLogger.error(e);
			bLogger.info('dismissing the environment due to previous error/s...');
			this.#notifyError(e);
		});
		this.#browsingContext.on('page', async page => {
			if (this.#envConfig.coverage) {
				await this.#installCoverageCollector(this.#envConfig.coverage, this.#browsingContext, page);
			}
		});
		if (this.#envConfig.coverage) {
			await this.#installCoverageCollector(this.#envConfig.coverage, this.#browsingContext, mainPage);
		}

		logger.info(`setting timeout for the whole tests execution to ${this.#envConfig.tests.ttl}ms as per configuration`);
		this.#timeoutHandle = setTimeout(() => {
			logger.error('tests execution timed out, dismissing the environment...');
			this.#notifyError(new Error(`environment timed out ${this.#envConfig.tests.ttl}ms`));
		}, this.#envConfig.tests.ttl);
		this.#browser.once('disconnected', () => this.#onDisconnected());

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

	#notifyError(error) {
		this.dispatchEvent(new CustomEvent('error', { detail: { error } }));
	}

	async #installCoverageCollector(coverageConfig, browsingContext, _mainPage) {
		const coverageTargets = await collectTargetSources(coverageConfig);
		if (!coverageTargets || !coverageTargets.length) {
			console.log('no coverage targets found, skipping coverage collection');
			return;
		}

		//	install coverage session
		this.#coverageSession = await browsingContext.newCDPSession(_mainPage);
		await Promise.all([
			this.#coverageSession.send('Profiler.enable'),
			this.#coverageSession.send('Debugger.enable'),
		]);
		await Promise.all([
			this.#coverageSession.send('Profiler.startPreciseCoverage', { callCount: true, detailed: true }),
			this.#coverageSession.send('Debugger.setSkipAllPauses', { skip: true })
		]);

		//	install test registrar and scripts listener
		this.#scriptsCoverageMap = {};
		browsingContext.exposeBinding(INTEROP_NAMES.REGISTER_TEST_FOR_COVERAGE, async ({ page }, testName) => {
			const session = await browsingContext.newCDPSession(page);

			await Promise.all([
				session.send('Debugger.enable'),
				session.send('Debugger.setSkipAllPauses', { skip: true })
			]);

			session.on('Debugger.scriptParsed', e => {
				if (e.url.startsWith(`${serverConfig.origin}/aut/`)) {
					if (!this.#scriptsCoverageMap[e.scriptId]) {
						this.#scriptsCoverageMap[e.scriptId] = testName;
					} else {
						console.error(`unexpected duplication of script ${e.scriptId} [${e.url}]`);
					}
				}
			});
		});
	}

	#onDisconnected() {
		clearTimeout(this.#timeoutHandle);
		logger.info(`browser environment '${this.#envConfig.id}' disconnected`);
		this.dispatchEvent(new CustomEvent('dismissed'));
	}

	async #collectArtifacts() {
		const [coverage, logs] = await Promise.all([
			this.#collectCoverage(),
			this.#collectLogs()
		]);
		return { coverage, logs };
	}

	async #collectCoverage() {
		if (!this.#coverageSession) {
			return null;
		}

		const result = {};
		const jsCoverage = (await this.#coverageSession.send('Profiler.takePreciseCoverage')).result;
		for (const scriptCoverage of jsCoverage) {
			const testId = this.#scriptsCoverageMap[scriptCoverage.scriptId];
			if (!testId) {
				continue;
			}

			const trPath = scriptCoverage.url.replace(`${serverConfig.origin}/aut/`, './');
			const trSCov = { ...scriptCoverage };
			trSCov.url = trPath;

			result[testId] = result[testId] || [];
			throw new Error('replace the single cov process with the new methods');
			//result[testId].push(processV8ScriptCoverage(trSCov));
		}
		return result;
	}

	async #collectLogs() {
		//	TODO
		return null;
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