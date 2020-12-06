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

const logger = new Logger({ context: 'browsers env launcher' });

export default async function launch(sessionId, envConfig) {
	if (!envConfig || !envConfig.browsers) {
		throw new Error(`env configuration expected to have browsers set to some value; got ${JSON.stringify(envConfig)}`);
	}

	const browserPromises = [];
	for (const be of envConfig.browsers) {
		browserPromises.push(launchAndRunInBrowser(sessionId, be.type, envConfig));
	}

	await Promise.all(browserPromises);

	logger.info('TODO: collect reports');
	logger.info('TODO: persist reports');

	return;
}

async function launchAndRunInBrowser(sessionId, type, envConfig) {
	logger.info(`launching '${type}'...`);
	const browser = await playwright[type].launch({
		logger: {
			isEnabled: () => true,
			log: (name, severity, message, args) => console.log(`${name} ${severity} ${message} ${args}`)
		}
	});
	const bLogger = new Logger({
		context: `${type}-${browser.version()}`,
		outputs: [new FileOutput(`./reports/logs/${type}-${browser.version()}.log`)]
	});
	const context = await browser.newContext({
		logger: {
			isEnabled: () => true,
			log: (name, severity, message, args) => console.log(`${name} ${severity} ${message} ${args}`)
		}
	});

	context.on('page', async pe => {
		//	coverage
		let coverage = false;
		if (envConfig.coverage && pe.coverage) {
			await pe.coverage.startJSCoverage({ reportAnonymousScripts: true });
			coverage = true;
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

	const page = await context.newPage({
		logger: {
			isEnabled: () => true,
			log: (name, severity, message, args) => console.log(`${name} ${severity} ${message} ${args}`)
		}
	});
	page.on('console', async msgs => {
		for (const msg of msgs.args()) {
			const consoleMessage = await msg.evaluate(o => o);
			bLogger.info(consoleMessage);
		}
	});
	page.on('error', e => {
		bLogger.error('"error" event fired on page', e);
	});
	page.on('pageerror', e => {
		bLogger.error('"pageerror" event fired on page ', e);
	});

	logger.info(envConfig);

	const envEntryUrl = `http://localhost:${serverConfig.port}?ses-id=${sessionId}&env-id=${envConfig.id}`;
	logger.info(`navigating testing environment to '${envEntryUrl}'...`);
	await page.goto(envEntryUrl);

	return new Promise((resolve, reject) => {
		logger.info(`setting timeout for the whole tests execution to ${envConfig.tests.ttl} as per configuration`);
		const timeoutHandle = setTimeout(() => {
			logger.error('tests execution timed out, closing environment...');
			browser.removeListener('disconnected', onDisconnected);
			browser.close().finally(() => {
				logger.error('... closed');
				reject('timeout');
			});
		}, envConfig.tests.ttl);

		function onDisconnected() {
			clearTimeout(timeoutHandle);
			logger.info(`environment '${envConfig.id}' DONE (disconnected), collecting reports...`);
			resolve({});
		}

		browser.once('disconnected', onDisconnected);
	});
}