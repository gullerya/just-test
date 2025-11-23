import Logger from '../logger/logger.js';
import { RequestHandlerBase } from './request-handler-base.ts';
import { EXT_TO_MIME_MAP } from '../server-utils.ts';
import { addSession, storeResult, getAll, getSession } from '../sessions/sessions-service.js';
import { collectTestResources } from '../../testing/testing-service.js';
import { IncomingMessage, ServerResponse } from 'node:http';

export default class APIRequestHandler extends RequestHandlerBase {
	#config;
	#logger;

	constructor(config) {
		super();
		this.#config = config;
		this.#logger = new Logger({ context: `'API' handler` });
		this.#logger.info(`'API' requests handler initialized; basePath: '${this.basePath}'`);
	}

	get config() { return this.#config; }
	get basePath() { return 'api'; }

	async handle(handlerRelativePath: string, req: IncomingMessage, res: ServerResponse): Promise<void> {
		let handled = false;
		if (/^.+\/sessions(|\/.+)$/.test(handlerRelativePath)) {
			if (req.method === 'POST') {
				if (handlerRelativePath.endsWith('sessions')) {
					await this.#createSession(req, res);
					handled = true;
				} else {
					await this.#storeResult(handlerRelativePath, req, res);
					handled = true;
				}
			} else if (req.method === 'GET') {
				if (handlerRelativePath.endsWith('sessions')) {
					await this.#getAllSessions(res);
					handled = true;
				} else {
					await this.#getSession(handlerRelativePath, res);
					handled = true;
				}
			}
		}

		if (!handled) {
			res.writeHead(404).end();
		}
	}

	async #createSession(req: IncomingMessage, res: ServerResponse): Promise<void> {
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

		const sessionId = await addSession(sessionConfig);
		res.writeHead(201, { 'Content-Type': EXT_TO_MIME_MAP.json })
			.end(JSON.stringify({
				sessionId: sessionId
			}));
	}

	async #storeResult(handlerRelativePath: string, req: IncomingMessage, res: ServerResponse): Promise<void> {
		/* eslint-disable no-unused-vars */
		const [sesId, _envConst, envId] = handlerRelativePath.split('/').slice(2);
		const sesResult = await new Promise((resolve, reject) => {
			try {
				let data = '';
				req.on('error', reject);
				req.on('data', chunk => data += chunk);
				req.on('end', () => resolve(JSON.parse(data)));
			} catch (error) {
				reject(error);
			}
		});
		await storeResult(sesId, envId, sesResult);
		res.writeHead(201).end();
	}

	async #getAllSessions(res: ServerResponse): Promise<void> {
		const allSessions = await getAll();
		res.writeHead(200, { 'Content-Type': EXT_TO_MIME_MAP.json }).end(JSON.stringify(allSessions));
	}

	async #getSession(handlerRelativePath: string, res: ServerResponse): Promise<void> {
		const [sesId, entity, entityId, ...args] = handlerRelativePath.split('/').slice(2);

		if (!sesId) {
			res.writeHead(400).end(`invalid session ID part`);
			return;
		}

		if (sesId === 'interactive') {
			const sessions = await getAll();
			let iResult = null;
			if (sessions && Object.values(sessions).length === 1) {
				const iSession = Object.values(sessions)[0];
				for (const e of Object.values(iSession.config.environments)) {
					if (e.interactive) {
						iResult = { id: iSession.id };
					}
				}
			}
			res.writeHead(200, { 'Content-Type': EXT_TO_MIME_MAP.json }).end(JSON.stringify(iResult));
			return;
		}

		if (!entity) {
			res.writeHead(400).end(`invalid entity part`);
			return;
		}

		const session = await getSession(sesId);
		if (!session) {
			res.writeHead(404).end(`session '${sesId}' not found`);
			return;
		}

		let result;
		let found = false;
		if (entity === 'environments') {
			result = await this.#getEnvironmentData(session, entityId, args);
			found = true;
		} else if (entity === 'result') {
			result = session.result;
			found = true;
		}

		if (found) {
			if (result) {
				res.writeHead(200, { 'Content-Type': EXT_TO_MIME_MAP.json }).end(JSON.stringify(result));
			} else {
				res.writeHead(204).end();
			}
		} else {
			res.writeHead(404).end(`'${entity}' for session '${sesId}' not found`);
		}
	}

	async #getEnvironmentData(session, envId: string, args: string[]): Promise<string[]> {
		let result = null;
		const env = session.config.environments[envId];

		if (envId === 'interactive') {
			for (const e of Object.values(session.config.environments)) {
				if (e.interactive) {
					return { id: e.id };
				}
			}
		}

		if (env) {
			if (args[0] === 'config') {
				result = env;
			} else if (args[0] === 'test-file-paths') {
				result = await collectTestResources(
					env.tests.include,
					env.tests.exclude
				);
			}
		}
		return result;
	}
}