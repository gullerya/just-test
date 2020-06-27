import http from 'http';
import Logger from '../logger/logger.js';
import buildConfig from './server-service-config.js';

const
	logger = new Logger('JustTest [local server]'),
	STATUS_STOPPED = 0,
	STATUS_RUNNING = 1,
	CONFIG_KEY = Symbol('config.key'),
	STATUS_KEY = Symbol('status.key'),
	SERVER_KEY = Symbol('server.key'),
	BASE_URL_KEY = Symbol('base.url.key');

class ServerService {
	constructor() {
		const effectiveConf = buildConfig();
		effectiveConf.handlers.push('./static-resource-request-handler.js');

		this[CONFIG_KEY] = Object.freeze(effectiveConf);
		this[STATUS_KEY] = STATUS_STOPPED;
		this[SERVER_KEY] = null;
		this[BASE_URL_KEY] = `http://localhost:${effectiveConf.port}`;
	}

	async start() {
		if (this[STATUS_KEY] === STATUS_RUNNING) {
			logger.error('http server already running');
			return null;
		}

		const port = this[CONFIG_KEY].port;
		logger.info(`starting local server on port ${port}...`);

		//	init handlers
		const
			handlerPromises = [],
			handlers = [];
		this[CONFIG_KEY].handlers.forEach(h => {
			handlerPromises.push(new Promise(resolve => {
				import(h).then(hp => {
					const HandlerConstructor = hp.default;
					handlers.push(new HandlerConstructor(this[CONFIG_KEY], this[BASE_URL_KEY]));
				}).catch(e => {
					logger.error(`failed to initialize custom http handler from '${h}': ${e}`);
				}).finally(resolve);
			}));
		});
		await Promise.all(handlerPromises);

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