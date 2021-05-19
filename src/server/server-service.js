/**
 * Server Service responsible for:
 * - initializing the handlers and the infra configuration (port)
 * - starting the server
 */
import * as http from 'http';
import { performance as P } from 'perf_hooks';
import Logger from './logger/logger.js';
import buildConfig from './server-configurer.js';
import { dismissAll } from './environments/environments-service.js';

export {
	config,
	start,
	stop
}

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
		//	build configuration
		const effectiveConf = buildConfig(serverConfig);
		this[CONFIG_KEY] = effectiveConf;
		config = effectiveConf;
		logger.info('server service effective config:');
		logger.info(effectiveConf);

		//	init service
		this[STATUS_KEY] = STATUS_STOPPED;
		this[SERVER_KEY] = null;
		this[BASE_URL_KEY] = `http://localhost:${this.effectiveConfig.port}`;
		this[HANDLERS_READY_PROMISE_KEY] = this.initHandlers();
	}

	async initHandlers() {
		const
			started = P.now(),
			handlers = [],
			handlerBasePaths = [];
		for (const h of this[CONFIG_KEY].handlers) {
			const handlerCTor = (await import(h)).default;
			const handler = new handlerCTor(this[CONFIG_KEY]);

			for (const bup of handlerBasePaths) {
				if (handler.basePath === '/' || bup === '/') {
					if (handler.basePath === bup) {
						throw new Error(`'basePath' of handlers MUST be exclusive, violators: '${bup}' and '${handler.basePath}'`);
					}
				} else if (bup.indexOf(handler.basePath) === 0 || handler.basePath.indexOf(bup) === 0) {
					throw new Error(`'basePath' of handlers MUST be exclusive, violators: '${bup}' and '${handler.basePath}'`);
				}
			}
			handlerBasePaths.push(handler.basePath);
			handlers.push(handler);
		}
		logger.info(`... initialized ${handlers.length} handler/s (${(P.now() - started).toFixed(1)}ms)`);
		return handlers;
	}

	async start() {
		if (this[STATUS_KEY] === STATUS_RUNNING) {
			logger.error('server is already running');
			return null;
		}

		const handlers = await this[HANDLERS_READY_PROMISE_KEY];

		const port = this[CONFIG_KEY].port;
		logger.info(`starting local server on port ${port}...`);

		//	init dispatcher
		const mainRequestDispatcher = async function mainRequestHandler(req, res) {
			const { pathname } = new URL(req.url, `http://localhost:${port}`);
			const path = pathname === '/' || pathname === '' ? '/ui' : pathname;
			const handler = handlers.find(h => path.startsWith(h.basePath));
			if (handler) {
				try {
					let ownPath = path.substring(handler.basePath.length);
					ownPath = ownPath.startsWith('/') ? ownPath.substring(1) : ownPath;
					await handler.handle(ownPath, req, res);
				} catch (error) {
					logger.error(`sending 500 for '${req.url}' due to:`);
					logger.error(error);
					res.writeHead(500).end(`${error}`);
				}
			} else {
				res.writeHead(404, `no handler matched '${req.url}'`).end();
			}
		};

		//	init server
		logger.info(`\tregistered ${handlers.length} request handler/s`);
		const s = http.createServer(mainRequestDispatcher);
		this[SERVER_KEY] = s.listen(port);

		this[STATUS_KEY] = STATUS_RUNNING;
		logger.info(`... local server started on port ${port}`);
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