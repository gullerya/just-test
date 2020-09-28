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

const logger = new Logger({ context: 'browser env launcher' });

export default function launch(envConfig) {
	if (!envConfig || !envConfig.browser) {
		throw new Error(`env configuration expected to have browser set to some value; got ${JSON.stringify(envConfig)}`);
	}

	logger.info(obtainEffectiveConfig('testsConfig'));

	return Promise.reject('not yet implemented');
}