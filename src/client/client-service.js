import util from 'util';
import Logger from '../logger/logger.js';
import buildConfig from './client-service-config.js';

const
	logger = new Logger({ context: 'client' }),
	CONFIG_KEY = Symbol('config.key');

/**
 * one time instantiated class - singleton
 */
class ClientService {
	constructor() {
		const effectiveConfig = buildConfig();
		logger.info('client service effective config:');
		logger.info(util.inspect(effectiveConfig, false, null, true));

		this[CONFIG_KEY] = effectiveConfig;
	}

	get effectiveConfig() {
		return this[CONFIG_KEY];
	}
}

export default new ClientService();