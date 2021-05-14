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
		logger.info(`interactive session '${this.sessionId}' launched`);
		logger.info(`open your browser and navigate to <host>:${serverConfig.port}`);
		return Promise.resolve();
	}
}

async function launch(sessionId) {
	const result = new InteractiveEnvImpl(sessionId, serverConfig);
	result.launch();
	return result;
}