import http from 'http';
import Logger from '../logging/logger.js';
import { StaticResourceRequestHandler } from './static-resource-request-handler.js';

const
	logger = new Logger('JustTest [local server]'),
	STATUS_STOPPED = 0,
	STATUS_RUNNING = 1,
	CONFIG_KEY = Symbol('config.key'),
	STATUS_KEY = Symbol('status.key');
let server;

export class HttpServer {
	constructor(config) {
		if (!config) {
			throw new Error(`invalid config '${config}'`);
		}

		//	validations and resolutions
		this[CONFIG_KEY] = config;
		this[STATUS_KEY] = STATUS_STOPPED;
	}

	start() {
		if (this[STATUS_KEY] === STATUS_RUNNING) {
			logger.error('http server already running');
			return null;
		}

		const port = this[CONFIG_KEY].port;
		logger.info(`starting local server on port ${port}...`);

		//	define base url
		const urlBase = 'http://localhost:' + port;
		logger.info(`\tbase URL is ${urlBase}`);

		const handlers = [];
		handlers.push(new StaticResourceRequestHandler(this[CONFIG_KEY], urlBase));
		//	TODO: add extensibility point of custom request handlers
		const mainRequestDispatcher = function mainRequestHandler(req, res) {
			handlers.some(async handler => {
				return await handler.handle(req, res);
			});
		};
		logger.info(`\tregistered ${handlers.length} request handler/s`);
		server = http.createServer(mainRequestDispatcher).listen(port);

		this[STATUS_KEY] = STATUS_RUNNING;
		logger.info(`... local server started on port ${port}`);
		return urlBase;
	}

	stop() {
		if (this[STATUS_KEY] === STATUS_RUNNING) {
			server.close(() => {
				this[STATUS_KEY] = STATUS_STOPPED;
				logger.info('local server stopped');
			});
		}
	}
}