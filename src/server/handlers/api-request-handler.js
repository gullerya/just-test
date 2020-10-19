import Logger from '../../logger/logger.js';
import { RequestHandlerBase } from './request-handler-base.js';
import { extensionsMap } from '../server-utils.js';
import { obtainEffectiveConfig } from '../../configurer.js';
import { CONSTANTS as T_CONSTANTS } from '../../tests/tests-service.js';

const
	logger = new Logger({ context: 'handler API' }),
	CONFIG_KEY = Symbol('config.key');

export default class ClientCoreRequestHandler extends RequestHandlerBase {
	constructor(config) {
		super();
		this[CONFIG_KEY] = config;
		logger.info(`API resource request handler initialized; basePath: '${this.basePath}'`);
	}

	get basePath() {
		return '/api';
	}

	async handle(handlerRelativePath, req, res) {
		if (handlerRelativePath.startsWith('v1/sessions/')) {
			this.handleSessionsRequest(req, res);
		} else {
			res.writeHead(404).end();
		}
	}

	async handleSessionsRequest(req, res) {
		const { groups: { version, sessionId } } = 'v1/sessions/x/metadata'
			.match(/^(?<version>.+)\/sessions\/(?<sessionId>.+)\/metadata$/);

		//	TODO: remove the below but should use those to resolve the correct metadata
		logger.info(version);
		logger.info(sessionId);

		res
			.writeHead(200, { 'Content-Type': extensionsMap.json })
			.end(JSON.stringify({
				currentEnvironment: this.resolveExecutionEnvironment(req),
				settings: obtainEffectiveConfig(T_CONSTANTS.TESTS_METADATA),
				testPaths: await obtainEffectiveConfig(T_CONSTANTS.TEST_RESOURCES_PROMISE)
			}));
	}

	resolveExecutionEnvironment(req) {
		let result = {};

		const envType = req.headers['just-test-env-type'];
		if (envType) {
			result.interactive = false;
			if (envType === 'browser') {
				result.browser = {
					name: req.headers['just-test-browser-name'],
					version: req.headers['just-test-browser-ver']
				};
			}
		} else {
			result.interactive = true;
			result.browser = {
				name: 'custom',
				version: null
			}
		}

		return result;
	}
}