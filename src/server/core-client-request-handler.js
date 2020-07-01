import fs from 'fs';
import { URL } from 'url';
import path from 'path';
import glob from 'glob';
import Logger from '../logger/logger.js';
import { RequestHandlerBase } from './request-handler-base.js';

const
	logger = new Logger('JustTest [static resources handler]'),
	BASE_URL_KEY = Symbol('base.url.key'),
	CONFIG_KEY = Symbol('config.key'),
	FILE_RESOURCES_KEY = Symbol('file.resources.key'),
	extMap = {
		'.html': 'text/html',
		'.js': 'text/javascript',
		'.css': 'text/css',
		'.json': 'application/json'
	};

export default class CoreClientRequestHandler extends RequestHandlerBase {
	constructor(config, baseUrl) {
		super();
		this[BASE_URL_KEY] = baseUrl;
		this[CONFIG_KEY] = config;

		//	resolve resources list
		const fileResources = [];
		config.include.forEach(i => {
			fileResources.push(...glob.sync(i, {
				nodir: true,
				nosort: true,
				ignore: config.exclude
			}));
		});

		this[FILE_RESOURCES_KEY] = fileResources;

		logger.info(`static resource request handler initialized; baseUrlPath: '${this.baseUrlPath}', total resources: ${fileResources.length}`);
	}

	get baseUrlPath() {
		return '/';
	}

	async handle(req, res) {
		const
			asUrl = new URL(req.url, this[BASE_URL_KEY]),
			filePath = '.' + (asUrl.pathname === '/' ? '/main.html' : asUrl.pathname),
			extension = path.extname(filePath),
			contentType = extMap[extension] ?? 'text/plain';

		fs.readFile(path.resolve('bin/client/ui', filePath), (error, content) => {
			if (!error) {
				res.writeHead(200, { 'Content-Type': contentType }).end(content);
			} else {
				if (error.code === 'ENOENT') {
					logger.warn(`sending 404 for '${filePath}'`);
					res.writeHead(404).end();
				} else {
					logger.warn(`sending 500 for '${filePath}'`);
					res.writeHead(500, { 'Content-Type': 'application/json' }).end(JSON.stringify(error));
				}
			}
		});

		return true;
	};
}