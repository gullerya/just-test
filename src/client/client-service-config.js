import configurer from '../configurer.js';

const
	browserKinds = Object.freeze(['chromium', 'firefox', 'webkit']),
	defaultConfig = Object.freeze({
		browsers: [
			{ kind: 'chromium', config: {} }
		]
	});

export default () => {
	const result = configurer.mergeConfig(defaultConfig, configurer.givenConfig.client);
	validate(result);
	return result;
};

function validate(config) {
	if (!Array.isArray(config.browsers)) {
		throw new Error(`'browsers' expected to be an array; got ${config.browsers}`);
	}
	config.browsers.forEach(browser => {
		if (!browser || typeof browser !== 'object') {
			throw new Error(`each entry in 'browsers' MUST be a non-null object; found ${browser}`);
		}
		if (!browserKinds.includes(browser.kind)) {
			throw new Error(`browser kind MUST be one of ${browserKinds}; found ${browser.kind}`);
		}
	});
}