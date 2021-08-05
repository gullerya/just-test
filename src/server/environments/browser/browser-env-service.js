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
import { INTEROP_NAMES, SESSION_ENVIRONMENT_KEYS } from '../../../common/constants.js';
import { waitInterval } from '../../../common/await-utils.js';
import { config as serverConfig } from '../../server-service.js';
import { collectTargetSources, processV8ScriptCoverage } from '../../coverage/coverage-service.js';
import { EnvironmentBase } from '../environment-base.js';
import playwright from 'playwright';

export default launch;

const logger = new Logger({ context: 'browser env service' });

class BrowserEnvImpl extends EnvironmentBase {

	/**
	 * construct browser environment for a specific session
	 * 
	 * @param {string} sessionId session ID
	 * @param {object} envConfig environment setup
	 */
	constructor(sessionId, envConfig) {
		super(sessionId);

		this.envConfig = envConfig;
		this.browser = null;
		this.consoleLogger = null;
		this.coverageSession = null;
		this.scriptsCoverageMap = null;
		this.dismissPromise = null;
		this.timeoutHandle = null;

		Object.seal(this);
	}

	async launch() {
		const browserType = this.envConfig.browser.type;
		logger.info(`launching '${browserType}' environment...`);
		const browser = await playwright[browserType].launch();

		this.consoleLogger = new FileOutput(`./reports/logs/${browserType}-${browser.version()}.log`);
		const bLogger = new Logger({
			context: `${browserType}-${browser.version()}`,
			outputs: [this.consoleLogger]
		});

		const browsingContext = await browser.newContext();
		const mainPage = await browsingContext.newPage();

		if (this.envConfig.coverage) {
			await this.installCoverageCollector(this.envConfig.coverage, browsingContext, mainPage);
		}
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
			this.dismiss();
		});

		logger.info(`setting timeout for the whole tests execution to ${this.envConfig.tests.ttl}ms as per configuration`);
		this.timeoutHandle = setTimeout(() => {
			logger.error('tests execution timed out, dismissing the environment...');
			this.dismiss();
		}, this.envConfig.tests.ttl);
		browser.once('disconnected', () => this.onDisconnected());

		const envEntryUrl = `${serverConfig.origin}/core/runner/environments/browser/browser-session-runner.html` +
			`?${SESSION_ENVIRONMENT_KEYS.SESSION_ID}=${this.sessionId}` +
			`&${SESSION_ENVIRONMENT_KEYS.ENVIRONMENT_ID}=${this.envConfig.id}`;
		logger.info(`navigating testing environment to '${envEntryUrl}'...`);
		await mainPage.goto(envEntryUrl);

		this.browser = browser;
	}

	async installCoverageCollector(coverageConfig, browsingContext, _mainPage) {
		const coverageTargets = await collectTargetSources(coverageConfig);
		if (!coverageTargets || !coverageTargets.length) {
			console.log('no coverage targets found, skipping coverage collection');
			return;
		}

		//	install coverage session
		this.coverageSession = await browsingContext.newCDPSession(_mainPage);
		await Promise.all([
			this.coverageSession.send('Profiler.enable'),
			this.coverageSession.send('Debugger.enable'),
		]);
		await Promise.all([
			this.coverageSession.send('Profiler.startPreciseCoverage', { callCount: true, detailed: true }),
			this.coverageSession.send('Debugger.setSkipAllPauses', { skip: true })
		]);

		//	install test registrar and scripts listener
		this.scriptsCoverageMap = {};
		browsingContext.exposeBinding(INTEROP_NAMES.REGISTER_TEST_FOR_COVERAGE, async ({ page }, testId) => {
			const session = await browsingContext.newCDPSession(page);

			await Promise.all([
				session.send('Debugger.enable'),
				session.send('Debugger.setSkipAllPauses', { skip: true })
			]);

			session.on('Debugger.scriptParsed', e => {
				if (e.url.startsWith(`${serverConfig.origin}/aut/`)) {
					if (!this.scriptsCoverageMap[e.scriptId]) {
						this.scriptsCoverageMap[e.scriptId] = testId;
					} else {
						console.error(`unexpected duplication of script ${e.scriptId} [${e.url}]`);
					}
				}
			});
		});
	}

	async dismiss() {
		if (!this.dismissPromise) {
			logger.info(`dismissing environment '${this.envConfig.id}'...`);
			this.dismissPromise = waitInterval(999)
				.then(async () => {
					await this.consoleLogger.close();
					const artifacts = await this.collectArtifacts();
					await BrowserEnvImpl.closeBrowser(this.browser);
					logger.info(`... environment '${this.envConfig.id}' dismissed`);
					return artifacts;
				});
		}
		return this.dismissPromise;
	}

	onDisconnected() {
		clearTimeout(this.timeoutHandle);
		logger.info(`browser environment '${this.envConfig.id}' disconnected`);
	}

	async collectArtifacts() {
		const [coverage, logs] = await Promise.all([
			this.collectCoverage(),
			this.collectLogs()
		]);
		return { coverage, logs };
	}

	async collectCoverage() {
		if (!this.coverageSession) {
			return null;
		}

		const result = {};
		const jsCoverage = (await this.coverageSession.send('Profiler.takePreciseCoverage')).result;
		for (const scriptCoverage of jsCoverage) {
			const testId = this.scriptsCoverageMap[scriptCoverage.scriptId];
			if (!testId) {
				continue;
			}

			const trPath = scriptCoverage.url.replace(`${serverConfig.origin}/aut/`, './');
			const trSCov = { ...scriptCoverage };
			trSCov.url = trPath;

			result[testId] = result[testId] || [];
			result[testId].push(processV8ScriptCoverage(trSCov));
		}
		return result;
	}

	async collectLogs() {
		//	TODO
		return null;
	}

	static async closeBrowser(browser) {
		logger.info('closing browser...');
		await browser.close();
		logger.info('... browser closed');
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