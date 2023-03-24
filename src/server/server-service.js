/**
 * Server Service responsible for:
 * - initializing the handlers and the infra configuration (port)
 * - starting the server
 */
import * as http from 'node:http';
import Logger from './logger/logger.js';
import { dismissAll } from './environments/environments-service.js';

export {
	config,
	start,
	stop
};

const
	logger = new Logger({ context: 'server' }),
	STATUS_STOPPED = 0,
	STATUS_RUNNING = 1,
	CONFIG_KEY = Symbol('config.key'),
	STATUS_KEY = Symbol('status.key'),
	SERVER_KEY = Symbol('server.key'),
	BASE_URL_KEY = Symbol('base.url.key'),
	HANDLERS_READY_PROMISE_KEY = Symbol('handlers.ready.promise.key');

let config;
let server;

class ServerService {
	constructor(serverConfig) {
		this[CONFIG_KEY] = serverConfig;
		config = serverConfig;

		this[STATUS_KEY] = STATUS_STOPPED;
		this[SERVER_KEY] = null;
		this[BASE_URL_KEY] = this.effectiveConfig.origin;
		this[HANDLERS_READY_PROMISE_KEY] = this.initHandlers();
	}

	async initHandlers() {
		const
			started = globalThis.performance.now(),
			candidates = this[CONFIG_KEY].handlers,
			handlers = {};
		logger.info(`initializing ${candidates.length} handler/s...`);
		for (const h of candidates) {
			const handlerCTor = (await import(h)).default;
			const handler = new handlerCTor(this[CONFIG_KEY]);
			if (handler.basePath in handlers) {
				throw new Error(`base path '${handler.basePath}' is already registered`);
			}
			handlers[handler.basePath] = handler;
		}
		logger.info(`... initialized ${Object.keys(handlers).length} handler/s (${(globalThis.performance.now() - started).toFixed(1)}ms)`);
		return handlers;
	}

	async start() {
		if (this[STATUS_KEY] === STATUS_RUNNING) {
			logger.error('server is already running');
			return null;
		}

		const handlers = await this[HANDLERS_READY_PROMISE_KEY];

		const
			origin = this[CONFIG_KEY].origin,
			port = this[CONFIG_KEY].port;
		logger.info(`starting listening on port ${port} (full origin '${origin}')...`);

		//	init dispatcher
		const mainRequestDispatcher = async function mainRequestHandler(req, res) {
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
					res.writeHead(500, http.STATUS_CODES[500]).end();
				}
			} else {
				res.writeHead(404, `no handler matched '${req.url}'`).end();
			}
		};

		//	init server
		logger.info(`\tregistered ${Object.keys(handlers).length} handler/s`);
		const s = http.createServer(mainRequestDispatcher);
		this[SERVER_KEY] = s.listen(port);
		s.on('listening', () => {
			this[STATUS_KEY] = STATUS_RUNNING;
			logger.info(`... listening on port ${port}`);
		});
		this.stopPromise = new Promise(r => {
			s.on('close', () => {
				this[STATUS_KEY] = STATUS_STOPPED;
				logger.info(`port ${port} closed`);
				r();
			});
		});
	}

	async stop() {
		let resPromise;
		logger.info('stopping local server...');
		if (this[SERVER_KEY] && this[STATUS_KEY] === STATUS_RUNNING) {
			resPromise = new Promise(resolve => {
				this[SERVER_KEY].close(closeError => {
					this[STATUS_KEY] = STATUS_STOPPED;
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
		return this[CONFIG_KEY];
	}

	get baseUrl() {
		return this[BASE_URL_KEY];
	}

	get isRunning() {
		return this[STATUS_KEY] === STATUS_RUNNING;
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