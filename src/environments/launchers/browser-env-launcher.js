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
import { obtainEffectiveConfig } from '../../configurer.js';
import { CONSTANTS as S_CONSTANTS } from '../../server/server-service.js';
import { CONSTANTS as T_CONSTANTS } from '../../tests/tests-service.js';
import playwright from 'playwright';

const logger = new Logger({ context: 'browser env launcher' });

export default async function launch(envConfig) {
	if (!envConfig || !envConfig.browser) {
		throw new Error(`env configuration expected to have browser set to some value; got ${JSON.stringify(envConfig)}`);
	}

	const serverConfig = obtainEffectiveConfig(S_CONSTANTS.SERVER_CONFIG);
	const testsConfig = obtainEffectiveConfig(T_CONSTANTS.TESTS_METADATA);

	try {
		const browser = await playwright[envConfig.browser].launch({
			logger: {
				isEnabled: () => true,
				log: (name, severity, message, args) => console.log(`${name} ${severity} ${message} ${args}`)
			}
		});
		const context = await browser.newContext({
			logger: {
				isEnabled: () => true,
				log: (name, severity, message, args) => console.log(`${name} ${severity} ${message} ${args}`)
			}
		});
		const page = await context.newPage({
			logger: {
				isEnabled: () => true,
				log: (name, severity, message, args) => console.log(`${name} ${severity} ${message} ${args}`)
			}
		});
		page.on('console', msg => {
			for (let i = 0; i < msg.args().length; ++i)
				console.log(`${i}: ${msg.args()[i]}`);
		});
		page.on('error', e => {
			logger.error('"error" event fired on page', e);
		});
		page.on('pageerror', e => {
			logger.error('"pageerror" event fired on page ', e);
		})
		page.goto(`http://localhost:${serverConfig.port}`);

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
	} catch (e) {
		return Promise.reject(e);
	}
}