/**
 * Service to provide interactive environment, that is:
 * - not opening browsers
 * - not being shut down automatically
 * 
 * @param {Object} envConfig environment configuration
 * @param {boolean} envConfig.interactive in this context expected always to equal true
 */
import Logger from '../../logger/logger.js';
import { serverConfig } from '../../server-service.js';
import { EnvironmentBase } from '../environment-base.js';

export default launch;

const logger = new Logger({ context: 'interactive env service' });

class InteractiveEnvImpl extends EnvironmentBase {
	constructor(sessionId, envConfig) {
		super(sessionId);
		this.envConfig = envConfig;
	}

	async launch() {
		logger.info(`interactive environment for session '${this.sessionId}' launched`);
		logger.info(`open your browser and navigate to <host>:${serverConfig.port}`);
		return Promise.resolve();
	}

	async dismiss() {
		logger.info(`please close your browser/tab, environment '${this.envConfig.id}' is not longer alive`);
	}
}

/**
 * 'launches' interactive browsing environment
 * - won't actually do anything beside logging what use should do
 * 
 * @param {string} sessionId 
 * @param {object} envConfig 
 * @returns environment
 */
async function launch(sessionId, envConfig) {
	const result = new InteractiveEnvImpl(sessionId, envConfig);
	await result.launch();
	return result;
}