import DEFAULT_CONFIG from './default-configuration.js';

export default (serverConfig) => {
	const result = Object.assign({}, DEFAULT_CONFIG, serverConfig);
	result.origin = `${result.ssl ? 'https' : 'http'}://${result.hostname}:${result.port}`;
	result.handlers = Array.from(new Set([...result.handlers, ...DEFAULT_CONFIG.handlers]));

	validate(result);

	return Object.freeze(result);
};

function validate(config) {
	if (!config.origin || new URL(config.origin).origin !== config.origin) {
		throw new Error(`server origin MUST be an assemblage of valid protocol, hostname and port; found: '${config.origin}'`);
	}
	if (!Array.isArray(config.handlers) || !config.handlers.length) {
		throw new Error(`server handlers MUST be a non-empty array; got [${config.handlers}]`);
	}
}