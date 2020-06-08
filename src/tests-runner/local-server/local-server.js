const
	http = require('http'),
	{ StaticResourceRequestHandler } = require('./static-resource-request-handler.js');

let server;

module.exports = {
	start: start,
	stop: stop
};

function start(port, resourcesFolder) {
	console.info(`JustTest: starting local server on port ${port}...`);

	//	define base url
	const urlBase = 'http://localhost:' + port;
	console.info(`JustTest: \tbase URL is ${urlBase}`);

	const staticResourceRequestHander = new StaticResourceRequestHandler(resourcesFolder, urlBase);
	const mainRequestDispatcher = getMainRequestDispatcher([
		staticResourceRequestHander
	]);
	server = http.createServer(mainRequestDispatcher).listen(port);

	console.info(`JustTest: ... local server started on port ${port}`);
	return urlBase;
}

function stop() {
	server.close(() => console.info('JustTest: local server stopped'));
}

function getMainRequestDispatcher(handlers) {
	console.info(`JustTest: \tregistered ${handlers.length} request handler/s`);
	return function mainRequestHandler(req, res) {
		handlers.some(handler => {
			handler.handle(req, res);
			return req.handled;
		});
	};
}