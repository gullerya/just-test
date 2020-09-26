import Logger from '../logger/logger.js';

const
	logger = new Logger({ context: 'environment' }),
	ENVIRONMENTS_KEY = Symbol('environments.key');

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
			}
		} else if (configuration.environments && configuration.environments.length) {
			for (const env of configuration.environments) {
				logger.debug(env);
			}
		} else {
			logger.info('no environment configuration specified, defaulting to interactive');
		}

		this[ENVIRONMENTS_KEY] = Object.freeze(envs);
	}

	get environments() {
		return this[ENVIRONMENTS_KEY];
	}
}