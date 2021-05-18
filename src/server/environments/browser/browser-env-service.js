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
import { waitInterval } from '../../../common/await-utils.js';
import { config as serverConfig } from '../../server-service.js';
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

		this.consoleLogger = new FileOutput(`./reports/logs/${browserType}-${browser.version()}.log`);
		const bLogger = new Logger({
			context: `${browserType}-${browser.version()}`,
			outputs: [this.consoleLogger]
		});

		const context = await browser.newContext({
			logger: {
				isEnabled: () => true,
				log: (name, severity, message, args) => console.log(`${name} ${severity} ${message} ${args}`)
			}
		});

		context.on('page', async pe => {
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