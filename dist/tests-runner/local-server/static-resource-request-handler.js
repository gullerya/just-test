const
	fs = require('fs'),
	{ URL } = require('url'),
	path = require('path'),
	RequestHandlerBase = require('./request-handler-base.js'),
	extMap = {
		'.html': 'text/html',
		'.js': 'text/javascript',
		'.css': 'text/css',
		'.json': 'application/json'
	};

class StaticResourceRequestHandler extends RequestHandlerBase {
	constructor(resourcesBase, urlBase) {
		super();
		this.resourcesBase = resourcesBase;
		this.urlBase = urlBase;
		console.info(`JustTest: \tstatic resources will be served from ${resourcesBase}`);
	}

	handle(req, res) {
		const
			asUrl = new URL(req.url, this.urlBase),
			filePath = '.' + asUrl.pathname,
			extension = path.extname(filePath),
			contentType = extMap[extension] ?? 'text/plain';

		fs.readFile(path.resolve(this.resourcesBase, filePath), (error, content) => {
			if (!error) {
				res.writeHead(200, { 'Content-Type': contentType }).end(content);
			} else {
				if (error.code === 'ENOENT') {
					console.warn(`JustTest [local-server]: sending 404 for '${filePath}'`);
					res.writeHead(404).end();
				} else {
					console.warn(`JustTest [local-server]: sending 500 for '${filePath}'`);
					res.writeHead(500, { 'Content-Type': 'application/json' }).end(JSON.stringify(error));
				}
			}
		});

		req.handled = true;
	};
}

module.exports = {
	StaticResourceRequestHandler: StaticResourceRequestHandler
}