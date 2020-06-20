export default class BrowserService {
	constructor(config) {
		this[CONFIG_KEY] = Object.freeze(buildConfig(config));

	}
}