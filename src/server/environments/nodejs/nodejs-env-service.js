/**
 * This will launch NodeJS environment, that is:
 * - spawning process/es as needed for encapsulated tests run
 * - running all tests in those processes
 * - collect results and shut down child processes
 * 
 * @param {Object} envConfig environment configuration
 * @param {string} envConfig.browser in this context expected always to equal true
 */
import Logger from '../../logger/logger.js';

const logger = new Logger({ context: 'NodeJS env launcher' });

export default async function launch(sessionId, envConfig) {
	if (!envConfig || !envConfig.node) {
		throw new Error(`env configuration expected to have node set to some value; got ${JSON.stringify(envConfig)}`);
	}

	logger.info(`launching NodeJS environment...`);
	throw new Error('NodeJS environment is not yet fully supported');
}