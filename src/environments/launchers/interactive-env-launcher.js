/**
 * 
 * @param {Object} envConfig environment configuration
 */
import Logger from '../../logger/logger.js';
import { obtainEffectiveConfig } from '../../configurer.js';

const logger = new Logger({ context: 'interactive env launcher' });

export default function launch(envConfig) {
	if (!envConfig || !envConfig.interactive) {
		throw new Error(`env configuration expected to have interactive set to true; got ${JSON.stringify(envConfig)}`);
	}

	logger.info(`interactive enviroment is ready`);
	logger.info(`to run tests open a browser and navigate <host>:${obtainEffectiveConfig('serverConfig').port}`);

	return new Promise(() => { });
}