import Logger from '../../logging/logger.ts';
import { RequestHandlerBase } from './request-handler-base.ts';
import { EXT_TO_MIME_MAP } from '../server-utils.ts';
import { addSession, storeResult, getAll, getSession } from '../sessions/sessions-service.ts';
import { collectTestResources } from '../../testing/testing-service.ts';
import { IncomingMessage, ServerResponse } from 'node:http';
import type { EnvironmentMetadata, SessionCreateResponse } from '../api-contracts.ts';

type Route = {
	method: 'GET' | 'POST';
	pattern: RegExp;
	keys: string[];
	handler: (this: APIRequestHandler, params: Record<string, string>, req: IncomingMessage, res: ServerResponse) => Promise<void>;
};

function route(method: Route['method'], template: string, handler: Route['handler']): Route {
	const keys: string[] = [];
	const pattern = new RegExp('^' + template.replace(/:([a-zA-Z]+)/g, (_, k) => {
		keys.push(k);
		return '([^/]+)';
	}) + '$');
	return { method, pattern, keys, handler };
}

export default class APIRequestHandler extends RequestHandlerBase {
	#config;
	#logger;
	#routes: Route[];

	constructor(config) {
		super();
		this.#config = config;
		this.#logger = new Logger({ context: `'API' handler` });
		this.#routes = [
			route('POST', '/v1/sessions', this.#createSession),
			route('GET', '/v1/sessions', this.#getAllSessions),
			route('GET', '/v1/sessions/interactive', this.#getInteractiveSession),
			route('GET', '/v1/sessions/:sesId/result', this.#getSessionResult),
			route('GET', '/v1/sessions/:sesId/environments/:envId/metadata', this.#getEnvironmentMetadata),
			route('POST', '/v1/sessions/:sesId/environments/:envId/result', this.#postEnvironmentResult)
		];
		this.#logger.info(`'API' requests handler initialized; basePath: '${this.basePath}'`);
	}

	get config() { return this.#config; }
	get basePath() { return 'api'; }

	async handle(handlerRelativePath: string, req: IncomingMessage, res: ServerResponse): Promise<void> {
		const path = '/' + handlerRelativePath;
		for (const r of this.#routes) {
			if (r.method !== req.method) {
				continue;
			}
			const match = r.pattern.exec(path);
			if (!match) {
				continue;
			}
			const params: Record<string, string> = {};
			for (let i = 0; i < r.keys.length; i++) {
				params[r.keys[i]] = match[i + 1];
			}
			await r.handler.call(this, params, req, res);
			return;
		}
		res.writeHead(404).end();
	}

	async #createSession(_params: Record<string, string>, req: IncomingMessage, res: ServerResponse): Promise<void> {
		const sessionConfig = await readJsonBody(req);
		const sessionId = await addSession(sessionConfig);
		const response: SessionCreateResponse = { sessionId };
		res.writeHead(201, { 'Content-Type': EXT_TO_MIME_MAP.json }).end(JSON.stringify(response));
	}

	async #getAllSessions(_params: Record<string, string>, _req: IncomingMessage, res: ServerResponse): Promise<void> {
		const allSessions = await getAll();
		res.writeHead(200, { 'Content-Type': EXT_TO_MIME_MAP.json }).end(JSON.stringify(allSessions));
	}

	async #getInteractiveSession(_params: Record<string, string>, _req: IncomingMessage, res: ServerResponse): Promise<void> {
		const sessions = await getAll();
		let iResult: object | null = null;
		if (sessions && Object.values(sessions).length === 1) {
			const iSession = Object.values(sessions)[0];
			for (const e of Object.values(iSession.config.environments)) {
				if ((e as any).interactive) {
					iResult = { id: iSession.id };
				}
			}
		}
		res.writeHead(200, { 'Content-Type': EXT_TO_MIME_MAP.json }).end(JSON.stringify(iResult));
	}

	async #getSessionResult({ sesId }: Record<string, string>, _req: IncomingMessage, res: ServerResponse): Promise<void> {
		const session = await getSession(sesId);
		if (!session) {
			res.writeHead(404).end(`session '${sesId}' not found`);
			return;
		}
		//	only publish the result once side-channel artifacts (e.g.
		//	coverage) have been attached by storeResult; otherwise callers
		//	polling `/result` race and resolve with a partial payload
		const result = session.resultReady ? session.result : null;
		if (result) {
			res.writeHead(200, { 'Content-Type': EXT_TO_MIME_MAP.json }).end(JSON.stringify(result));
		} else {
			res.writeHead(204).end();
		}
	}

	async #getEnvironmentMetadata({ sesId, envId }: Record<string, string>, _req: IncomingMessage, res: ServerResponse): Promise<void> {
		const session = await getSession(sesId);
		if (!session) {
			res.writeHead(404).end(`session '${sesId}' not found`);
			return;
		}
		const env = session.config.environments[envId];
		if (!env) {
			res.writeHead(404).end(`environment '${envId}' not found`);
			return;
		}
		const testPaths = await collectTestResources(env.tests.include, env.tests.exclude);
		const metadata: EnvironmentMetadata = {
			id: envId,
			sessionId: session.id,
			testPaths,
			browser: env.browser,
			node: env.node,
			interactive: env.interactive,
			tests: env.tests,
			coverageEnabled: Boolean(env.coverage),
			coverageInclude: env.coverage?.include
		};
		res.writeHead(200, { 'Content-Type': EXT_TO_MIME_MAP.json }).end(JSON.stringify(metadata));
	}

	async #postEnvironmentResult({ sesId, envId }: Record<string, string>, req: IncomingMessage, res: ServerResponse): Promise<void> {
		const sesResult = await readJsonBody(req);
		await storeResult(sesId, envId, sesResult);
		res.writeHead(201).end();
	}
}

async function readJsonBody(req: IncomingMessage): Promise<any> {
	return new Promise((resolve, reject) => {
		let data = '';
		req.on('error', reject);
		req.on('data', chunk => data += chunk);
		req.on('end', () => {
			try {
				resolve(JSON.parse(data));
			} catch (err) {
				reject(err);
			}
		});
	});
}
