import configurer from '../configurer.js';

const
	defaultConfig = Object.freeze({
		port: 3000,
		handlers: [
			'./handlers/api-request-handler.js',
			'./handlers/client-libs-request-handler.js',
			'./handlers/client-core-request-handler.js',
			'./handlers/test-resources-request-handler.js'
		],
		include: [
			'./bin/client/ui/**'
		],
		exclude: []
	});

export default (serverConfig) => {
	const result = configurer.mergeConfig(defaultConfig, configurer.givenConfig.server);
	validate(result);
	return result;
};

function validate(config) {
	//	port
	if (isNaN(parseInt(config.port))) {
		throw new Error(`invalid http server port ${config.port}`);
	}

	//	handlers
	if (!config.handlers || !Array.isArray(config.handlers)) {
		throw new Error(`'handlers' is expected to be an array of paths, got '${config.handlers}'`);
	}
	if (config.handlers.some(h => !h || typeof h !== 'string')) {
		throw new Error('\'handlers\' should contain a non-empty strings only');
	}

	//	include
	if (!config.include || !Array.isArray(config.include)) {
		throw new Error(`'include' is expected to be an array of paths, got '${config.include}'`);
	}
	if (config.include.some(i => !i || typeof i !== 'string')) {
		throw new Error('\'include\' should contain a non-empty strings only');
	}

	//	exclude
	if (!config.exclude || !Array.isArray(config.exclude)) {
		throw new Error(`'exclude' is expected to be an array of paths, got '${config.exclude}'`);
	}
	if (config.exclude.some(e => !e || typeof e !== 'string')) {
		throw new Error('\'exclude\' should contain a non-empty strings only');
	}
}