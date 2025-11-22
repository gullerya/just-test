/**
 * Server Service responsible for:
 * - initializing the handlers and the infra configuration (port)
 * - starting the server
 */
import { IncomingMessage, Server, ServerResponse, STATUS_CODES, createServer } from 'node:http';
import Logger from './logger/logger.js';
import { dismissAll } from './environments/environments-service.js';
import { RequestHandlerBase } from './handlers/request-handler-base.ts';

export {
	config,
	start,
	stop
};

const
	logger = new Logger({ context: 'server' }),
	STATUS_STOPPED = 0,
	STATUS_RUNNING = 1;

let config;
let server: ServerService;

class ServerService {
	#config;
	#status;
	#server: Server | null;
	#baseUrl;
	#handlersReadyPromise;
	#stopPromise: Promise<void>;

	constructor(serverConfig) {
		this.#config = serverConfig;
		config = serverConfig;

		this.#status = STATUS_STOPPED;
		this.#server = null;
		this.#baseUrl = this.effectiveConfig.origin;
		this.#handlersReadyPromise = this.initHandlers();
	}

	async initHandlers(): Promise<Record<string, RequestHandlerBase>> {
		const
			started = globalThis.performance.now(),
			candidates = this.#config.handlers,
			handlers = {} as Record<string, RequestHandlerBase>;
		logger.info(`initializing ${candidates.length} handler/s...`);
		for (const h of candidates) {
			const handlerCTor = (await import(h)).default;
			const handler: RequestHandlerBase = new handlerCTor(this.#config);
			if (handler.basePath in handlers) {
				throw new Error(`base path '${handler.basePath}' is already registered`);
			}
			handlers[handler.basePath] = handler;
		}
		logger.info(`... initialized ${Object.keys(handlers).length} handler/s (${(globalThis.performance.now() - started).toFixed(1)}ms)`);
		return handlers;
	}

	async start() {
		if (this.#status === STATUS_RUNNING) {
			logger.error('server is already running');
			return null;
		}

		const handlers = await this.#handlersReadyPromise;

		const
			origin = this.#config.origin,
			port = this.#config.port;
		logger.info(`starting listening on port ${port} (full origin '${origin}')...`);

		//	init dispatcher
		const mainRequestDispatcher = async function mainRequestHandler(req: IncomingMessage, res: ServerResponse) {
			const { pathname } = new URL(req.url, origin);
			const path = pathname === '/' || pathname === '' ? '/ui' : pathname;
			const basePath = path.split('/')[1];
			const handler = handlers[basePath];
			if (handler) {
				try {
					let ownPath = path.substring(handler.basePath.length + 1);
					ownPath = ownPath.startsWith('/') ? ownPath.substring(1) : ownPath;
					await handler.handle(ownPath, req, res);
				} catch (error) {
					logger.error(`sending 500 for '${req.url}' due to:`);
					logger.error(error);
					res.writeHead(500, STATUS_CODES[500]).end();
				}
			} else {
				res.writeHead(404, `no handler matched '${req.url}'`).end();
			}
		};

		//	init server
		logger.info(`\tregistered ${Object.keys(handlers).length} handler/s`);
		const s = createServer(mainRequestDispatcher);
		this.#server = s.listen(port);
		s.on('listening', () => {
			this.#status = STATUS_RUNNING;
			logger.info(`... listening on port ${port}`);
		});
		this.#stopPromise = new Promise<void>(r => {
			s.on('close', () => {
				this.#status = STATUS_STOPPED;
				logger.info(`port ${port} closed`);
				r();
			});
		});
	}

	async stop() {
		let resPromise;
		logger.info('stopping local server...');
		if (this.#server && this.#status === STATUS_RUNNING) {
			resPromise = new Promise<void>(resolve => {
				this.#server.close(closeError => {
					this.#status = STATUS_STOPPED;
					logger.info(`... local server stopped${closeError ? ` ${closeError}` : ``}`);
					resolve();
				});
			});
		} else {
			resPromise = Promise.resolve();
		}
		await resPromise;
	}

	get effectiveConfig() {
		return this.#config;
	}

	get baseUrl() {
		return this.#baseUrl;
	}

	get isRunning() {
		return this.#status === STATUS_RUNNING;
	}

	get stopPromise() {
		return this.#stopPromise;
	}
}

async function start(serverConfig) {
	server = new ServerService(serverConfig);
	await server.start();
	return server;
}

async function stop() {
	await Promise.all([
		server.stop(),
		dismissAll()
	]);
}