/**
 * This will launch interactive environment, that is:
 * - not opening browsers
 * - not being shut down automatically (may be reconsidered in the future)
 * - thus, ever pending
 * 
 * @param {Object} envConfig environment configuration
 * @param {boolean} envConfig.interactive in this context expected always to equal true
 */
import Logger from '../../logger/logger.js';
import { serverConfig } from '../../server-service.js';

const logger = new Logger({ context: 'interactive env launcher' });

export default async function launch(sessionId, envConfig) {
	if (!envConfig || !envConfig.interactive) {
		throw new Error(`env configuration expected to have interactive set to true; got ${JSON.stringify(envConfig)}`);
	}

	logger.info(`interactive session '${sessionId}' launched`);
	logger.info(`open your browser and navigate to <host>:${serverConfig.port}`);

	return new Promise(() => { });
}