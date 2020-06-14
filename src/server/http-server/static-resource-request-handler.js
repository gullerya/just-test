import fs from 'fs';
import { URL } from 'url';
import path from 'path';
import glob from 'glob';
import minimatch from 'minimatch';
import Logger from '../logging/logger.js';
import { RequestHandlerBase } from './request-handler-base.js';

const
	logger = new Logger('JustTest [static resources handler]'),
	BASSE_URL_KEY = Symbol('base.url.key'),
	CONFIG_KEY = Symbol('config.key'),
	FILE_RESOURCES_KEY = Symbol('file.resources.key'),
	extMap = {
		'.html': 'text/html',
		'.js': 'text/javascript',
		'.css': 'text/css',
		'.json': 'application/json'
	};

export class StaticResourceRequestHandler extends RequestHandlerBase {
	constructor(config, urlBase) {
		super();
		this[BASSE_URL_KEY] = urlBase;
		this[CONFIG_KEY] = config;

		//	resolve resources list
		const fileResources = [];
		config.includes.forEach(inc => {
			fileResources.push(...glob.sync(inc));
		});
		config.excludes.forEach(exc => {
			fileResources.forEach((r, i, a) => {
				if (minimatch(r, exc)) {
					a.splice(i, 1);
				}
			});
		});

		this[FILE_RESOURCES_KEY] = fileResources;

		logger.info(`static resource request handler initialized, registered ${fileResources.length} file resource/s`);
	}

	async handle(req, res) {
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