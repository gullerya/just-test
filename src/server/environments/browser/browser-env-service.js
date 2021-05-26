/**
 * This will launch browser environment, that is:
 * - launching browser instance as specified
 * - running all tests in that instance
 * - shuting the browser and reporting the run results
 * 
 * @param {Object} envConfig environment configuration
 * @param {string} envConfig.browser in this context expected always to equal true
 */
import Logger, { FileOutput } from '../../logger/logger.js';
import { INTEROP_NAMES } from '../../../common/constants.js';
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
		this.tctx = {};
	}

	/**
	 * launches browser and then runs the tests
	 * - each test runs in own context
	 */
	async launch() {
		const browserType = this.envConfig.browser.type;
		logger.info(`launching '${browserType}'...`);
		const browser = await playwright[browserType].launch();

		this.consoleLogger = new FileOutput(`./reports/logs/${browserType}-${browser.version()}.log`);
		const bLogger = new Logger({
			context: `${browserType}-${browser.version()}`,
			outputs: [this.consoleLogger]
		});

		const browsingContext = await browser.newContext();

		if (this.envConfig.coverage) {
			await this.installCoverageCollector(this.envConfig.coverage, browsingContext);
		}

		// browsingContext.on('page', async page => {
		// 	if (page === mainPage) {
		// 		return;
		// 	}

		// 	const title = await page.title();
		// 	console.log(title);
		// 	// await page.coverage.startJSCoverage();

		// 	const cdpSession = await page.context().newCDPSession(page);
		// 	await cdpSession.send('Profiler.enable');
		// 	await cdpSession.send('Profiler.startPreciseCoverage', { callCount: true, detailed: true });
		// 	this.cdpSessions[title] = cdpSession;
		// });

		const mainPage = await browsingContext.newPage();
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

		logger.info(`setting timeout for the whole tests execution to ${this.envConfig.tests.ttl} as per configuration`);
		this.timeoutHandle = setTimeout(() => {
			logger.error('tests execution timed out, dismissing the environment...');
			this.dismiss();
		}, this.envConfig.tests.ttl);
		browser.once('disconnected', () => this.onDisconnected());

		const envEntryUrl = `http://localhost:${serverConfig.port}/core/client/app.html?ses-id=${this.sessionId}&env-id=${this.envConfig.id}`;
		logger.info(`navigating testing environment to '${envEntryUrl}'...`);
		await mainPage.goto(envEntryUrl);

		this.browser = browser;
	}

	async installCoverageCollector(coverageConfig, browsingContext) {
		const coverageTargets = await collectTargetSources(coverageConfig);
		if (!coverageTargets || !coverageTargets.length) {
			console.log('no target found, skipping coverage collection');
			return;
		}

		browsingContext.exposeBinding(INTEROP_NAMES.START_COVERAGE_METHOD, async ({ page }, testId) => {
			const session = await page.context().newCDPSession(page);

			//if (!this.setc) {
			//	this.setc = true;
			await Promise.all([
				session.send('Profiler.enable'),
				session.send('Debugger.enable')
			]);
			await Promise.all([
				session.send('Profiler.startPreciseCoverage', { callCount: true, detailed: true }),
				session.send('Debugger.setSkipAllPauses', { skip: true })
			]);
			//}

			this.tctx[testId] = {
				session: session,
				scripts: []
			};

			session.on('Debugger.scriptParsed', e => {
				if (e.url.includes('/aut/')) {
					this.tctx[testId].scripts.push(e.scriptId);
				}
			});

			// await page.coverage.startJSCoverage();
		});

		browsingContext.exposeBinding(INTEROP_NAMES.TAKE_COVERAGE_METHOD, async ({ page }, testId) => {
			const result = [];

			const session = this.tctx[testId].session;


			const jsCoverage = (await session.send('Profiler.takePreciseCoverage')).result;
			// await session.send('Profiler.stopPreciseCoverage');
			await new Promise(r => setTimeout(r, 1500));
			// await cdpSession.detach();
			// delete this.cdpSessions[testId];

			// const jsCoverage = await page.coverage.stopJSCoverage();

			// const filteredEntries = jsCoverage.map(e => {
			// 	const trPath = e.url.replace(`http://localhost:${serverConfig.port}/aut/`, './');
			// 	if (coverageTargets.indexOf(trPath) < 0) {
			// 		return null;
			// 	} else {
			// 		const result = { ...e };
			// 		result.url = trPath;
			// 		return result;
			// 	}
			// }).filter(Boolean);

			console.log(Object.values(this.tctx).map(o => o.scripts));

			const filteredEntries = jsCoverage.map(e => {
				const trPath = e.url.replace(`http://localhost:${serverConfig.port}/aut/`, './');
				if (this.tctx[testId].scripts.indexOf(e.scriptId) < 0) {
					return null;
				} else {
					const result = { ...e };
					result.url = trPath;
					return result;
				}
			}).filter(Boolean);

			console.log(`${filteredEntries.length} - ${testId} - ${filteredEntries.map(e => e.scriptId).join(', ')}`);

			for (const scriptEntry of filteredEntries) {
				//	TODO: should check each new entry, cause seen unequal duplications
				if (result[scriptEntry.url]) {
					continue;
				}
				result.push(processV8ScriptCoverage(scriptEntry));
			}

			return result;
		});
	}

	async dismiss() {
		if (!this._dismissPromise) {
			logger.info(`dismissing environment '${this.envConfig.id}'...`);
			this._dismissPromise = waitInterval(999)
				.then(() => this.consoleLogger.close())
				.then(() => BrowserEnvImpl.closeBrowser(this.browser))
				.then(() => logger.info(`... environment '${this.envConfig.id}' dismissed`));
		}
		return this._dismissPromise;
	}

	onDisconnected() {
		clearTimeout(this.timeoutHandle);
		logger.info(`browser environment '${this.envConfig.id}' disconnected`);
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