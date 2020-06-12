import http from 'http';
import Logger from '../logger/logger.js';
import { StaticResourceRequestHandler } from './static-resource-request-handler.js';

const logger = new Logger('JustTest [local server]');
let server;

export {
	start,
	stop
};

function start(port, resourcesFolder) {
	logger.info(`starting local server on port ${port}...`);

	//	define base url
	const urlBase = 'http://localhost:' + port;
	logger.info(`\tbase URL is ${urlBase}`);

	const staticResourceRequestHander = new StaticResourceRequestHandler(resourcesFolder, urlBase);
	const mainRequestDispatcher = getMainRequestDispatcher([
		staticResourceRequestHander
	]);
	server = http.createServer(mainRequestDispatcher).listen(port);

	logger.info(`... local server started on port ${port}`);
	return urlBase;
}

function stop() {
	server.close(() => logger.info('local server stopped'));
}

function getMainRequestDispatcher(handlers) {
	logger.info(`\tregistered ${handlers.length} request handler/s`);
	return function mainRequestHandler(req, res) {
		handlers.some(handler => {
			handler.handle(req, res);
			return req.handled;
		});
	};
}