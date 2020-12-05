/**
 * This will launch browser environment, that is:
 * - launching browser instance as specified
 * - running all tests in that instance
 * - shuting the browser and reporting the run results
 * 
 * @param {Object} envConfig environment configuration
 * @param {string} envConfig.browser in this context expected always to equal true
 */
import Logger from '../../logger/logger.js';
import { serverConfig } from '../../server-service.js';
import playwright from 'playwright';

const logger = new Logger({ context: 'browsers env launcher' });

export default async function launch(envConfig) {
	if (!envConfig || !envConfig.browsers) {
		throw new Error(`env configuration expected to have browsers set to some value; got ${JSON.stringify(envConfig)}`);
	}

	const browserPromises = [];
	for (const be of envConfig.browsers) {
		browserPromises.push(launchAndRunInBrowser(be.type, envConfig));
	}

	await Promise.all(browserPromises);

	logger.info('TODO: collect reports');
	logger.info('TODO: persist reports');

	return;
}

async function launchAndRunInBrowser(type, envConfig) {
	logger.info(`launching browser '${type}'...`);
	const browser = await playwright[type].launch({
		logger: {
			isEnabled: () => true,
			log: (name, severity, message, args) => console.log(`${name} ${severity} ${message} ${args}`)
		}
	});
	const browserLogger = new Logger({ context: `${type} ${browser.version()}` });
	const context = await browser.newContext({
		logger: {
			isEnabled: () => true,
			log: (name, severity, message, args) => console.log(`${name} ${severity} ${message} ${args}`)
		}
	});
	context.on('page', async pe => {
		if (pe.coverage) {
			await pe.coverage.startJSCoverage({ reportAnonymousScripts: true });
			pe.on('console', async msgs => {
				for (const msg of msgs.args()) {
					const em = await msg.evaluate(o => o);
					logger.info(em);
				}
			});
			const url = await pe.url();
			logger.info(url);
			//await pe.goto(url);
			await new Promise(r => setTimeout(r, 1200));
			const coverage = await pe.coverage.stopJSCoverage();
			console.log(coverage.length);
			for (const entry of coverage) {
				//	console.log(entry);
			}
		}
	});

	const page = await context.newPage({
		logger: {
			isEnabled: () => true,
			log: (name, severity, message, args) => console.log(`${name} ${severity} ${message} ${args}`)
		}
	});
	page.on('console', async msgs => {
		for (const msg of msgs.args()) {
			const em = await msg.evaluate(o => o);
			browserLogger.info(em);
		}
	});
	page.on('error', e => {
		browserLogger.error('"error" event fired on page', e);
	});
	page.on('pageerror', e => {
		browserLogger.error('"pageerror" event fired on page ', e);
	});

	page.exposeBinding('forwardMessage', (_context, event) => {
		logger.info(event);
	});
	await page.goto(`http://localhost:${serverConfig.port}`);
	await page.evaluate(() => {
		window.addEventListener('message', event => {
			window.forwardMessage(event.data);
		});
	});

	return new Promise((resolve, reject) => {
		logger.info(`setting timeout for the whole tests execution to ${testsConfig.ttl} as per configuration`);
		const timeoutHandle = setTimeout(() => {
			logger.error('tests execution timed out, closing environment...');
			browser.removeListener('disconnected', onDisconnected);
			browser.close().finally(() => {
				logger.error('... closed');
				reject('timeout');
			});
		}, testsConfig.ttl);

		function onDisconnected() {
			clearTimeout(timeoutHandle);
			//	TODO: pickup the tests results here and submit in resolve
			resolve({});
		}

		browser.once('disconnected', onDisconnected);
	});
}