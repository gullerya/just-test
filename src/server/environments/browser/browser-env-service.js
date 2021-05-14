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
import { serverConfig } from '../../server-service.js';
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
	}

	/**
	 * launches browser and then runs the tests
	 * - each test runs in own context
	 */
	async launch() {
		const browserType = this.envConfig.browser.type;
		logger.info(`launching '${browserType}'...`);
		const browser = await playwright[browserType].launch({
			logger: {
				isEnabled: () => true,
				log: (name, severity, message, args) => console.log(`${name} ${severity} ${message} ${args}`)
			}
		});
		const bLogger = new Logger({
			context: `${browserType}-${browser.version()}`,
			outputs: [new FileOutput(`./reports/logs/${browserType}-${browser.version()}.log`)]
		});
		const context = await browser.newContext({
			logger: {
				isEnabled: () => true,
				log: (name, severity, message, args) => console.log(`${name} ${severity} ${message} ${args}`)
			}
		});

		context.on('page', async pe => {
			pe.title().then(t => console.log(`test page opened ${t}`));
			//	THIS is the place to collect per test data:
			//	logs, errors, coverage etc

			//	coverage
			if (this.envConfig.coverage && pe.coverage) {
				await pe.coverage.startJSCoverage({ reportAnonymousScripts: true });
			}
			pe.on('close', async () => {
				// if (coverage) {
				// 	const coverage = await pe.coverage.stopJSCoverage();
				// 	for (const entry of coverage) {
				// 		console.log(entry);
				// 	}
				// }
			});
		});

		const mainPage = await context.newPage({
			logger: {
				isEnabled: () => true,
				log: (name, severity, message, args) => console.log(`${name} ${severity} ${message} ${args}`)
			}
		});
		mainPage.on('console', async msgs => {
			for (const msg of msgs.args()) {
				const consoleMessage = await msg.evaluate(o => o);
				bLogger.info(consoleMessage);
			}
		});
		mainPage.on('error', e => {
			bLogger.error('"error" event fired on page', e);
			//	TODO: close the session?
		});
		mainPage.on('pageerror', e => {
			bLogger.error('"pageerror" event fired on page:');
			bLogger.error(e);
			bLogger.info('closing the session due to previous error/s');
			BrowserEnvImpl.closeBrowser(browser);
		});

		logger.info(`setting timeout for the whole tests execution to ${this.envConfig.tests.ttl} as per configuration`);
		const timeoutHandle = setTimeout(() => {
			logger.error('tests execution timed out, closing environment...');
			browser.removeListener('disconnected', onDisconnected);
			BrowserEnvImpl.closeBrowser(browser);
		}, this.envConfig.tests.ttl);

		function onDisconnected() {
			clearTimeout(timeoutHandle);
			logger.info(`environment '${this.envConfig.id}' DONE (disconnected)`);
		}
		browser.once('disconnected', onDisconnected);

		const envEntryUrl = `http://localhost:${serverConfig.port}?ses-id=${this.sessionId}&env-id=${this.envConfig.id}`;
		logger.info(`navigating testing environment to '${envEntryUrl}'...`);
		await mainPage.goto(envEntryUrl);
	}

	async dispose() {

	}

	static closeBrowser(browser) {
		const closePromise = browser.close()
		closePromise.finally(() => {
			logger.error('... closed');
		});
		return closePromise;
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

	const result = new BrowserEnvImpl(sessionId);
	await result.launch();
	return result;
}