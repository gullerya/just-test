const
	fs = require('fs'),
	{ URL } = require('url'),
	path = require('path'),
	http = require('http'),
	extMap = {
		'.html': 'text/html',
		'.js': 'text/javascript',
		'.css': 'text/css',
		'.json': 'application/json'
	};

const sockets = [];
let server, baseUrl;

module.exports = {
	launch: launch,
	stop: stop
};

function launch(port, resourcesFolder) {
	console.info('JustTest: starting local server on port ' + port + '...');
	server = http.createServer((req, res) => {
		const
			asUrl = new URL(req.url, baseUrl),
			filePath = '.' + asUrl.pathname,
			extension = path.extname(filePath),
			contentType = extMap[extension] ? extMap[extension] : 'text/plain';

		fs.readFile(path.resolve(resourcesFolder, filePath), (error, content) => {
			if (!error) {
				res.writeHead(200, { 'Content-Type': contentType });
				res.end(content, 'utf-8');
			} else {
				if (error.code === 'ENOENT') {
					console.warn('JustTest [local-server]: sending 404 for ' + filePath);
					res.writeHead(404, { 'Content-Type': 'text/plain' });
					res.end('requested resource "' + filePath + '" not found', 'utf-8');
				} else {
					console.warn('JustTest [local-server]: sending 500 for ' + filePath);
					res.writeHead(500, { 'Content-Type': 'text/plain' });
					res.end('unexpected error: ' + JSON.stringify(error), 'utf-8');
				}
			}
		});
	}).listen(port);

	server.on('connection', socket => {
		sockets.push(socket);
		socket.on('close', () => {
			const indexOfSocket = sockets.indexOf(socket);
			if (indexOfSocket >= 0) {
				sockets.splice(indexOfSocket, 1);
			}
		});
	});

	console.info('JustTest: ... local server started on port ' + port);
	baseUrl = 'http://localhost:' + port;
	return baseUrl;
}

function stop() {
	server.close(() => console.info('JustTest: local server closed'));
	sockets.forEach(socket => socket.destroy());
}