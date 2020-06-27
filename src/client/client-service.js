import buildConfig from './client-service-config.js';

const
	CONFIG_KEY = Symbol('config.key');

class ClientService {
	constructor() {
		this[CONFIG_KEY] = buildConfig();
	}

	get effectiveConfig() {
		return this[CONFIG_KEY];
	}
}

export default new ClientService();