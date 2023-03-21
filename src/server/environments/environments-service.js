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
import launchInteractive from './interactive/interactive-env-service.js';
import launchBrowser from './browser/browser-env-service.js';
import launchNode from './nodejs/nodejs-env-service.js';

export {
	verifyEnrichConfig,
	launch,
	dismiss,
	dismissAll
};

const logger = new Logger({ context: 'environments' });
const environments = {};

function verifyEnrichConfig(environmentConfig) {
	if (!environmentConfig || typeof environmentConfig !== 'object') {
		throw new Error(`environment config MUST be a non-null object, got ${environmentConfig}`);
	}
	return buildConfig(environmentConfig);
}

/**
 * receives the whole session data and runs tests for each environment
 * - multiple environments supported
 * 
 * @param {object} session 
 */
async function launch(session) {
	const envsToLaunch = Object.keys(session.config.environments).length;
	logger.info(`launching ${envsToLaunch} environment/s for session '${session.id}'...`);

	let envsLaunched = [];
	for (const envConfig of Object.values(session.config.environments)) {
		let env;
		if (envConfig.interactive) {
			env = await launchInteractive(session.id, envConfig);
		} else if (envConfig.browser) {
			env = await launchBrowser(session.id, envConfig);
		} else if (envConfig.node) {
			env = await launchNode(session.id, envConfig);
		} else {
			throw new Error(`unsupported environment configuration ${JSON.stringify(envConfig)}`);
		}
		env.addEventListener('error', ee => {
			logger.error(`unhandled error notified for environment ${envConfig.id}:`);
			logger.error(ee.detail.error);
			dismiss(envConfig.id);
		});
		environments[envConfig.id] = env;
		envsLaunched.push(env);
	}

	logger.info(`... launched ${envsLaunched.length} environment/s`);
	return envsLaunched;
}

/**
 * dismisses environment
 * 
 * @param {string} envId environment ID to be dismissed
 */
async function dismiss(envId) {
	if (!envId || typeof envId !== 'string') {
		throw new Error(`environment ID MUST be a non-empty string, got '${envId}'`);
	}

	const envToDismiss = environments[envId];
	if (envToDismiss) {
		logger.info(`dismissing environment '${envId}'...`);
		await envToDismiss.dismiss();
		delete environments[envId];
		logger.warn(`... environment '${envId}' dismissed`);
	} else {
		logger.warn(`environment '${envId}' was not found, nothing to dismiss`);
	}
}

/**
 * dismisses all environments
 */
async function dismissAll() {
	const dismissPromises = [];
	for (const envId of Object.keys(environments)) {
		dismissPromises.push(dismiss(envId));
	}
	await Promise.all(dismissPromises);
}