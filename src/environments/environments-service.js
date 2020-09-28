import Logger from '../logger/logger.js';
import launchInteractive from './launchers/interactive-env-launcher.js';
import launchBrowser from './launchers/browser-env-launcher.js';

const
	logger = new Logger({ context: 'environments' }),
	ENVIRONMENTS_KEY = Symbol('environments.key'),
	ENVIRONMENT_BLUEPRINT = Object.freeze({
		interactive: true,
		browser: null,
		device: null,
		scheme: null
	});

export default class EnvironmentsService {
	/**
	 * Environment Service initializer
	 * 
	 * @param {Array} [environments] - an array of environment configurations
	 * @param {Object} [clArguments] - command line arguments
	 */
	constructor(environments, clArguments) {
		const envs = [];

		if (clArguments && clArguments.envs) {
			const envArgs = clArguments.envs.split(/,|;/);
			for (const envArg of envArgs) {
				logger.debug(`parsing '${envArg}'...`);
				//	TODO
			}
		} else if (environments && environments.length) {
			for (const env of environments) {
				envs.push(Object.assign(
					{},
					ENVIRONMENT_BLUEPRINT,
					Object.entries(env)
						.filter(([key]) => key in ENVIRONMENT_BLUEPRINT)
						.reduce((pv, [key, value]) => { pv[key] = value; return pv; }, {})
				));
			}
		} else {
			logger.info('no environment configurations specified, defaulting to interactive');
			envs.push(Object.assign(
				{},
				ENVIRONMENT_BLUEPRINT,
				{ interactive: true }
			));
		}
		validateEnvironments(envs);
		reduceIdenticalEnvironments(envs);

		this[ENVIRONMENTS_KEY] = Object.freeze(envs);
	}

	get environments() {
		return this[ENVIRONMENTS_KEY];
	}

	launch(environments) {
		const result = [];
		for (const env of environments) {
			if (env.interactive) {
				result.push(launchInteractive(env));
			} else if (env.browser) {
				result.push(launchBrowser(env));
			} else {
				throw new Error(`unsuppoted environment configuration ${JSON.stringify(env)}`);
			}
		}
		return result;
	}
}

function validateEnvironments(envs) {
	for (const env of envs) {
		if (env.interactive && env.browser) {
			throw new Error(`environment can NOT be interactive and define browser; violator: ${JSON.stringify(env)}`);
		}
		if (env.interactive && (env.device || env.scheme)) {
			throw new Error(`interactive environment can NOT specify device or scheme; violator: ${JSON.stringify(env)}`);
		}
	}
}

function reduceIdenticalEnvironments(envs) {
	const map = {};
	const toBeRemoved = envs.filter(e => {
		const hash = JSON.stringify(e);
		if (hash in map) {
			logger.info(`removing duplicate environment (${hash})`);
			return true;
		} else {
			map[hash] = true;
			return false;
		}
	});
	for (const tbr of toBeRemoved) {
		envs.splice(envs.indexOf(tbr), 1);
	}
}