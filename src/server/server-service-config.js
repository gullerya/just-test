const
	DEFAULT_CONFIG = Object.freeze({
		port: 3000,
		handlers: [
			'./handlers/api-request-handler.js',
			'./handlers/aut-request-handler.js',
			'./handlers/core-request-handler.js',
			'./handlers/libs-request-handler.js',
			'./handlers/tests-request-handler.js'
		]
	});

export default (serverConfig, clArguments) => {
	const result = Object.assign({}, DEFAULT_CONFIG);

	//	port
	if (clArguments.port) {
		result.port = parseInt(clArguments.port);
	} else if (serverConfig.port) {
		result.port = parseInt(serverConfig.port);
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