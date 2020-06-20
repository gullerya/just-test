import buildConfig from './browser-service-config.js';

const
	CONFIG_KEY = Symbol('config.key');

export default class BrowserService {
	constructor(config) {
		this[CONFIG_KEY] = Object.freeze(buildConfig(config));
	}
}