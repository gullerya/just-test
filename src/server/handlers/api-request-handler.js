import Logger from '../logger/logger.js';
import { RequestHandlerBase } from './request-handler-base.js';
import { extensionsMap } from '../server-utils.js';
import { getSessionsService } from '../sessions/sessions-service.js';
import { getTestingService } from '../testing/testing-service.js';

const
	logger = new Logger({ context: 'handler API' }),
	CONFIG_KEY = Symbol('config.key');

export default class ClientCoreRequestHandler extends RequestHandlerBase {
	constructor(config) {
		super();
		this[CONFIG_KEY] = config;
		this.sessionsService = getSessionsService();
		logger.info(`API requests handler initialized; basePath: '${this.basePath}'`);
	}

	get basePath() {
		return '/api';
	}

	async handle(handlerRelativePath, req, res) {
		let handled = false;
		if (/^.+\/sessions(|\/.+)$/.test(handlerRelativePath)) {
			if (req.method === 'POST') {
				await this._createSession(req, res);
				handled = true;
			} else if (req.method === 'GET') {
				if (handlerRelativePath.endsWith('sessions')) {
					await this._getAllSessions(res);
					handled = true;
				} else {
					await this._getSession(handlerRelativePath, res);
					handled = true;
				}
			}
		}

		if (!handled) {
			res.writeHead(404).end();
		}
	}

	async _createSession(req, res) {
		const sessionConfig = await new Promise((resolve, reject) => {
			try {
				let data = '';
				req.on('error', reject);
				req.on('data', chunk => data += chunk);
				req.on('end', () => resolve(JSON.parse(data)));
			} catch (error) {
				reject(error);
			}
		});

		const sessionId = await this.sessionsService.addSession(sessionConfig);
		res.writeHead(201, { 'Content-Type': extensionsMap.json })
			.end(JSON.stringify({
				sessionId: sessionId
			}));
	}

	async _getAllSessions(res) {
		const allSessions = await this.sessionsService.getAll();
		res.writeHead(200, { 'Content-Type': extensionsMap.json }).end(JSON.stringify(allSessions));
	}

	async _getSession(handlerRelativePath, res) {
		const [version, _, sessionId, entity, entityId, ...args] = handlerRelativePath.split('/');

		if (!sessionId) {
			res.writeHead(400).end(`invalid session ID part`);
			return;
		}

		if (!entity) {
			res.writeHead(400).end(`invalid entity part`);
			return;
		}

		const session = await this.sessionsService.getSession(sessionId);
		if (!session) {
			res.writeHead(404).end(`session '${sessionId}' not found`);
			return;
		}

		let result;
		let found = false;
		if (entity === 'environments') {
			result = await this.getEnvironmentData(session, entityId, args);
			found = true;
		} else if (entity === 'result') {
			result = session.result;
			found = true;
		}

		if (found) {
			res.writeHead(200, { 'Content-Type': extensionsMap.json }).end(result ? JSON.stringify(result) : '');
		} else {
			res.writeHead(404).end(`'${entity}' for session '${sessionId}' not found`);
		}
	}

	async getEnvironmentData(session, envId, args) {
		let result = null;
		const env = session.config.environments[envId];
		if (env) {
			if (args[0] === 'config') {
				result = env;
			} else if (args[0] === 'test-file-paths') {
				result = await getTestingService().collectTestResources(
					env.tests.include,
					env.tests.exclude
				);
			}
		}
		return result;
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