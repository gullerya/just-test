/**
 * Environments service is responsible for:
 * - verification and enrichment (with the defaults) of the configuration
 * - launching, tracking and shutting down of non-interactive environments
 * 
 * In general, top level configuration of JustTest is a list of environments
 * with the definitions of each, including tests and coverage.
 * Default environment is INTERACTIVE (server opened for user's browser connection).
 */

import Logger from '../logger/logger.js';
import buildConfig from './environments-configurer.js';
import launchBrowsers from './launchers/browser-env-launcher.js';
import launchInteractive from './launchers/interactive-env-launcher.js';
import launchNode from './launchers/node-env-launcher.js';

export {
	getEnvironmentsService
}

const
	logger = new Logger({ context: 'environments' });

let environmentsServiceInstance;

class EnvironmentsService {
	verifyEnrichConfig(environmentConfig) {
		if (!environmentConfig || typeof environmentConfig !== 'object') {
			throw new Error(`environment config MUST be a non-null object, got ${environmentConfig}`);
		}
		return buildConfig(environmentConfig);
	}

	/**
	 * receives the whole session data and runs all environments of that
	 * @param {object} session 
	 */
	launch(session) {
		logger.info(`launching session '${session.id}': ${Object.keys(session.config.environments).length} environment/s...`);
		const result = [];
		for (const env of Object.values(session.config.environments)) {
			if (env.interactive) {
				result.push(launchInteractive(session.id, env));
			} else if (env.browsers) {
				result.push(launchBrowsers(session.id, env));
			} else if (env.node) {
				result.push(launchNode(session.id, env));
			} else {
				throw new Error(`unsupported environment configuration ${JSON.stringify(env)}`);
			}
		}
		logger.info(`... launched`);
		return Promise.all(result);
	}
}

function getEnvironmentsService() {
	if (!environmentsServiceInstance) {
		environmentsServiceInstance = new EnvironmentsService();
	}
	return environmentsServiceInstance;
}