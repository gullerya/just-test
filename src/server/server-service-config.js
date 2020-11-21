const
	DEFAULT_CONFIG = Object.freeze({
		port: 3000,
		handlers: [
			'./handlers/api-request-handler.js',
			'./handlers/aut-request-handler.js',
			'./handlers/lib-request-handler.js',
			'./handlers/tests-request-handler.js',
			'./handlers/ui-request-handler.js'
		]
	});

export default (serverConfig) => {
	const result = Object.assign({}, DEFAULT_CONFIG);
	const config = serverConfig || {};

	//	port
	if (config.port) {
		result.port = parseInt(config.port);
	}
	//	TODO: future place for extensibility

	validate(result);
	return Object.freeze(result);
};

function validate(config) {
	//	port
	if (!config.port || isNaN(config.port)) {
		throw new Error(`invalid http server port ${config.port}`);
	}
}