import http from 'http';
import Logger from '../logging/logger.js';
import ConfBuider from './http-service-config.js';
// import { StaticResourceRequestHandler } from './static-resource-request-handler.js';

const
	logger = new Logger('JustTest [local server]'),
	STATUS_STOPPED = 0,
	STATUS_RUNNING = 1,
	CONFIG_KEY = Symbol('config.key'),
	STATUS_KEY = Symbol('status.key'),
	BASE_URL_KEY = Symbol('base.url.key');
let server;

export class HttpService {
	constructor(config) {
		const effectiveConf = ConfBuider.build(config);
		effectiveConf.handlers.push('./static-resource-request-handler.js');

		this[CONFIG_KEY] = Object.freeze(effectiveConf);
		this[STATUS_KEY] = STATUS_STOPPED;
		this[BASE_URL_KEY] = `http://localhost:${effectiveConf.port}`;
	}

	async start() {
		if (this[STATUS_KEY] === STATUS_RUNNING) {
			logger.error('http server already running');
			return null;
		}

		const port = this[CONFIG_KEY].port;
		logger.info(`starting local server on port ${port}...`);

		//	init handlers - intentionally lazy one
		const handlers = [];
		this[CONFIG_KEY].handlers.forEach(async h => {
			try {
				const HandlerCTor = await import(h).default;
				handlers.push(new HandlerCTor(this[CONFIG_KEY]));
			} catch (e) {
				logger.error(`failed to initialize custom http handler from '${h}', ${e}`);
			}
		});

		//	init dispatcher
		const mainRequestDispatcher = function mainRequestHandler(req, res) {
			handlers.some(async handler => {
				return await handler.handle(req, res);
			});
		};

		//	init server
		logger.info(`\tregistered ${handlers.length} request handler/s`);
		server = http.createServer(mainRequestDispatcher).listen(port);

		this[STATUS_KEY] = STATUS_RUNNING;
		logger.info(`... local server started on port ${port}`);
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