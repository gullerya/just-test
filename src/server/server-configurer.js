const
	DEFAULT_CONFIG = Object.freeze({
		protocol: 'http:',
		hostname: 'localhost',
		port: '3000',
		origin: 'http://localhost:3000',
		handlers: [
			'./handlers/api-request-handler.js',
			'./handlers/aut-request-handler.js',
			'./handlers/core-request-handler.js',
			'./handlers/lib-request-handler.js',
			'./handlers/tests-request-handler.js',
			'./handlers/ui-request-handler.js'
		]
	});

export default (serverConfig) => {
	const result = Object.assign({}, DEFAULT_CONFIG, serverConfig);

	validate(result);

	return Object.freeze(result);
};

function validate(config) {
	if (!config.origin || config.origin !== `${config.protocol}//${config.hostname}:${config.port}`) {
		throw new Error(`server origin MUST be an assemblage of valid protocol, hostname and port`);
	}
	if (!Array.isArray(config.handlers) || !config.handlers.length) {
		throw new Error(`server handlers MUST be a non-empty array; got [${config.handlers}]`);
	}
}