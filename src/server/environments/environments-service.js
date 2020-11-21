import Logger from '../logger/logger.js';
import launchInteractive from './launchers/interactive-env-launcher.js';
import launchBrowser from './launchers/browser-env-launcher.js';

const
	logger = new Logger({ context: 'environments' }),
	CL_ENVS_SPLITTER = ';',
	CL_ENV_TOKENS_SPLITTER = ',',
	ENVIRONMENTS_KEY = Symbol('environments.key'),
	ENVIRONMENT_BLUEPRINT = Object.freeze({
		interactive: true,
		browser: null,
		device: null,
		scheme: null
	}),
	INTERACTIVE = 'interactive',
	BROWSERS = Object.freeze({
		chromium: true,
		firefox: true,
		webkit: true
	}),
	SCHEMES = Object.freeze({
		light: true,
		dark: true
	});

export const CONSTANTS = Object.freeze({
	ENVS: 'envs'
});

export default class EnvironmentsService {
	/**
	 * Environment Service initializer
	 * 
	 * @param {Array} [envConfigs] - an array of environment configurations
	 * @param {Object} [clArguments] - command line arguments
	 */
	constructor(envConfigs, clArguments) {
		const envs = [];

		if (clArguments && clArguments.envs) {
			const envArgs = clArguments.envs.split(CL_ENVS_SPLITTER);
			for (const envArg of envArgs) {
				envs.push(parseCLArgAsEnv(envArg));
			}
		} else if (envConfigs && envConfigs.length) {
			for (const envConfig of envConfigs) {
				envs.push(processEnvConfig(envConfig));
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

		logger.info('environments:', this.environments);
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

function parseCLArgAsEnv(clArg) {
	const tokens = clArg.split(CL_ENV_TOKENS_SPLITTER);
	const tmp = {};
	for (const token of tokens) {
		if (token === INTERACTIVE) {
			//	DO NOTHING
		} else if (token in BROWSERS) {
			tmp.browser = token;
			tmp.interactive = false;
		} else if (token in SCHEMES) {
			tmp.scheme = token;
		} else {
			throw new Error(`unexpected token in 'envs' command line parameter '${token}'`);
		}
	}
	return Object.assign({}, ENVIRONMENT_BLUEPRINT, tmp);
}

function processEnvConfig(envConfig) {
	const tmp = {};
	Object.entries(envConfig).forEach(([key, value]) => {
		if (!(key in ENVIRONMENT_BLUEPRINT)) {
			throw new Error(`unexpected environment configuration key '${key}'`);
		}
		if (key === 'browser' && value in BROWSERS) {
			tmp.browser = value;
			tmp.interactive = false;
		} else if (key === 'scheme' && value in SCHEMES) {
			tmp.scheme = value;
		} else {
			throw new Error(`unexpected environment configuration value '${value}' for key '${key}'`);
		}
	});
	return Object.assign({}, ENVIRONMENT_BLUEPRINT, tmp);
}

function validateEnvironments(envs) {
	if (!envs || !envs.length) {
		throw new Error(`at least 1 environment for a tests execution expected; found ${envs}`);
	}
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