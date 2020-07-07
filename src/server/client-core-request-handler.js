import fs from 'fs';
import path from 'path';
import glob from 'glob';
import Logger from '../logger/logger.js';
import { RequestHandlerBase } from './request-handler-base.js';

const
	logger = new Logger('JustTest [client core handler]'),
	CONFIG_KEY = Symbol('config.key'),
	FILE_RESOURCES_KEY = Symbol('file.resources.key'),
	extMap = {
		html: 'text/html',
		js: 'text/javascript',
		css: 'text/css',
		json: 'application/json',
		xml: 'application/xml'
	};

export default class ClientCoreRequestHandler extends RequestHandlerBase {
	constructor(config) {
		super();
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

		logger.info(`client core resource request handler initialized; basePath: '${this.basePath}', total resources: ${fileResources.length}`);
	}

	get basePath() {
		return '/core';
	}

	async handle(handlerRelativePath, req, res) {
		const filePath = handlerRelativePath === '' ? 'main.html' : handlerRelativePath;
		const extension = this.extractExtension(filePath);
		const contentType = extMap[extension] ?? 'text/plain';

		fs.readFile(path.resolve('bin/client/ui', filePath), (error, content) => {
			if (!error) {
				res.writeHead(200, { 'Content-Type': contentType }).end(content);
			} else {
				if (error.code === 'ENOENT') {
					logger.warn(`sending 404 for '${filePath}'`);
					res.writeHead(404).end();
				} else {
					logger.warn(`sending 500 for '${filePath}'`);
					res.writeHead(500).end(error.toString());
				}
			}
		});
	};

	extractExtension(filePath) {
		const i = filePath.lastIndexOf('.');
		if (i > 0) {
			return filePath.substring(i + 1);
		} else {
			return '';
		}
	}
}