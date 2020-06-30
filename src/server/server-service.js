import http from 'http';
import { performance } from 'perf_hooks';
import Logger from '../logger/logger.js';
import buildConfig from './server-service-config.js';

const
	logger = new Logger('JustTest [local server]'),
	STATUS_STOPPED = 0,
	STATUS_RUNNING = 1,
	HANDLERS_READY_KEY = Symbol('ready.key'),
	CONFIG_KEY = Symbol('config.key'),
	STATUS_KEY = Symbol('status.key'),
	SERVER_KEY = Symbol('server.key'),
	BASE_URL_KEY = Symbol('base.url.key');

class ServerService {
	constructor() {
		const effectiveConf = buildConfig();
		effectiveConf.handlers.push('./static-resource-request-handler.js');
		effectiveConf.include.unshift('./bin/client/ui/**');

		this[CONFIG_KEY] = Object.freeze(effectiveConf);
		this[STATUS_KEY] = STATUS_STOPPED;
		this[SERVER_KEY] = null;
		this[BASE_URL_KEY] = `http://localhost:${effectiveConf.port}`;

		this[HANDLERS_READY_KEY] = this.initHandlers();
	}

	async initHandlers() {
		const
			started = performance.now(),
			handlerPromises = [],
			handlerBaseUrlPaths = [],
			handlers = [];
		this[CONFIG_KEY].handlers.forEach(h => {
			handlerPromises.push(new Promise((resolve, reject) => {
				import(h).then(hp => {
					const HandlerConstructor = hp.default;
					const handler = new HandlerConstructor(this[CONFIG_KEY], this[BASE_URL_KEY]);
					if (handlerBaseUrlPaths.some(bup => bup.indexOf(handler.baseUrlPath) === 0 || handler.baseUrlPath.indexOf(bup) === 0)) {
						throw new Error(`'baseUrlPath' of handlers MUST be exclusive, violators: ${bup} and ${handler.baseUrlPath}`);
					} else {
						handlerBaseUrlPaths.push(handler.baseUrlPath);
						handlers.push(handler);
					}
					resolve(handler);
				}).catch(e => {
					logger.error(`failed to initialize server handler '${h}': ${e}`);
					reject(e);
				});
			}));
		});
		const hr = await Promise.all(handlerPromises);
		logger.info(`... ${handlers.length} handler/s initialized in ${Math.floor(performance.now() - started)}ms`);
		return handlers;
	}

	async start() {
		if (this[STATUS_KEY] === STATUS_RUNNING) {
			logger.error('http server already running');
			return null;
		}

		const handlers = await this[HANDLERS_READY_KEY];

		const port = this[CONFIG_KEY].port;
		logger.info(`starting local server on port ${port}...`);

		//	init dispatcher
		const mainRequestDispatcher = function mainRequestHandler(req, res) {
			handlers.some(async handler => {
				return await handler.handle(req, res);
			});
		};

		//	init server
		logger.info(`\tregistered ${handlers.length} request handler/s`);
		this[SERVER_KEY] = http.createServer(mainRequestDispatcher).listen(port);

		this[STATUS_KEY] = STATUS_RUNNING;
		logger.info(`... local server started on port ${port}`);
	}

	stop() {
		if (this[SERVER_KEY] && this[STATUS_KEY] === STATUS_RUNNING) {
			this[SERVER_KEY].close(() => {
				this[STATUS_KEY] = STATUS_STOPPED;
				logger.info('local server stopped');
			});
		}
	}

	get effectiveConfig() {
		return this[CONFIG_KEY];
	}

	get baseUrl() {
		return this[BASE_URL_KEY];
	}

	get running() {
		return this[STATUS_KEY] === STATUS_RUNNING;
	}
}

export default new ServerService();