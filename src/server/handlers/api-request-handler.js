import Logger from '../logger/logger.js';
import { RequestHandlerBase } from './request-handler-base.js';
import { extensionsMap } from '../server-utils.js';
import { getSessionsService } from '../sessions/sessions-service.js';
import { CONSTANTS as T_CONSTANTS } from '../testing/tests-service.js';

const
	logger = new Logger({ context: 'handler API' }),
	CONFIG_KEY = Symbol('config.key');

export default class ClientCoreRequestHandler extends RequestHandlerBase {
	constructor(config) {
		super();
		this[CONFIG_KEY] = config;
		logger.info(`API requests handler initialized; basePath: '${this.basePath}'`);
	}

	get basePath() {
		return '/api';
	}

	async handle(handlerRelativePath, req, res) {
		if (handlerRelativePath.startsWith('v1/sessions/')) {
			this.handleSessionsRequest(req, res);
		} else {
			logger.warn(`sending 404 for '${handlerRelativePath}'`);
			res.writeHead(404).end();
		}
	}

	async handleSessionsRequest(req, res) {
		const { groups: { version, sessionId } } = 'v1/sessions/x/metadata'
			.match(/^(?<version>.+)\/sessions\/(?<sessionId>.+)\/metadata$/);

		logger.info(`version for versioning API is ${version}`);
		const session = getSessionsService().getSession(sessionId);

		res
			.writeHead(200, { 'Content-Type': extensionsMap.json })
			.end(JSON.stringify({
				currentEnvironment: this._resolveExecutionEnvironment(req),
				settings: obtainEffectiveConfig(T_CONSTANTS.TESTS_METADATA),
				testPaths: await obtainEffectiveConfig(T_CONSTANTS.TEST_RESOURCES_PROMISE)
			}));
	}

	async _createSession() {

	}

	async _obtainSession() {

	}

	_resolveExecutionEnvironment(req) {
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