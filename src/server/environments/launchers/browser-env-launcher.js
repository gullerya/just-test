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
import playwright from 'playwright';

const logger = new Logger({ context: 'browser env launcher' });

export default async function launch(sessionId, envConfig) {
	if (!envConfig || !envConfig.browser) {
		throw new Error(`env configuration expected to have browser set to some value; got ${JSON.stringify(envConfig)}`);
	}

	return launchAndRunInBrowser(sessionId, envConfig);
}

/**
 * launches browser and then runs the tests
 * - each test runs in own context
 *
 * @param {string} sessionId session ID
 * @param {object} envConfig environment setup
 */
async function launchAndRunInBrowser(sessionId, envConfig) {
	const browserType = envConfig.browser.type;
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
		if (envConfig.coverage && pe.coverage) {
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
		closeBrowser(browser);
	});

	logger.info(`setting timeout for the whole tests execution to ${envConfig.tests.ttl} as per configuration`);
	const timeoutHandle = setTimeout(() => {
		logger.error('tests execution timed out, closing environment...');
		browser.removeListener('disconnected', onDisconnected);
		closeBrowser(browser);
	}, envConfig.tests.ttl);

	function onDisconnected() {
		clearTimeout(timeoutHandle);
		logger.info(`environment '${envConfig.id}' DONE (disconnected)`);
	}
	browser.once('disconnected', onDisconnected);

	const envEntryUrl = `http://localhost:${serverConfig.port}?ses-id=${sessionId}&env-id=${envConfig.id}`;
	logger.info(`navigating testing environment to '${envEntryUrl}'...`);
	await mainPage.goto(envEntryUrl);
}

function closeBrowser(browser) {
	const closePromise = browser.close()
	closePromise.finally(() => {
		logger.error('... closed');
	});
	return closePromise;
}