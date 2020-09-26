import Logger from '../logger/logger.js';

const
	logger = new Logger({ context: 'environment' }),
	ENVIRONMENTS_KEY = Symbol('environments.key'),
	ENVIRONMENT_BLUEPRINT = Object.freeze({
		interactive: true,
		browser: null,
		device: null,
		scheme: null
	});

export default class EnvironmentService {
	constructor(configuration) {
		if (!configuration || typeof configuration !== 'object') {
			throw new Error(`configuration MUST be a non-null object, got '${configuration}'`);
		}

		const envs = [];

		if (configuration.cliArguments && configuration.cliArguments.envs) {
			const envArgs = configuration.cliArguments.envs.split(/,|;/);
			for (const envArg of envArgs) {
				logger.debug(`parsing '${envArg}'...`);
				//	TODO
			}
		} else if (configuration.environments && configuration.environments.length) {
			for (const env of configuration.environments) {
				envs.push(Object.assign(
					{},
					ENVIRONMENT_BLUEPRINT,
					Object.entries(env)
						.filter(([key]) => key in ENVIRONMENT_BLUEPRINT)
						.reduce((pv, [key, value]) => pv[key] = value, {})
				));
			}
		} else {
			logger.info('no environment configuration specified, defaulting to interactive');
			envs.push(Object.assign(
				{},
				ENVIRONMENT_BLUEPRINT,
				{ interactive: true }
			));
		}
		EnvironmentService.validateEnvironments(envs);
		EnvironmentService.reduceIdenticalEnvironments(envs);

		this[ENVIRONMENTS_KEY] = Object.freeze(envs);
	}

	get environments() {
		return this[ENVIRONMENTS_KEY];
	}

	static validateEnvironments(envs) {
		for (const env of envs) {
			if (env.interactive && env.browser) {
				throw new Error(`environment can NOT be interactive and define browser; violator: ${JSON.stringify(env)}`);
			}
			if (env.interactive && (env.device || env.scheme)) {
				throw new Error(`interactive environment can NOT specify device or scheme; violator: ${JSON.stringify(env)}`);
			}
		}
	}

	static reduceIdenticalEnvironments(envs) {
		const map = {};
		const toBeRemoved = envs.filter(e => {
			const hash = JSON.stringify(e);
			if (hash in map) {
				logger.info(`removing identical environment from the list (${hash})`);
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
}