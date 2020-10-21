import fs from 'fs';
import path from 'path';
import Logger from '../../logger/logger.js';
import { RequestHandlerBase } from './request-handler-base.js';
import { findMimeType, extensionsMap } from '../server-utils.js';

const
	logger = new Logger({ context: 'handler client core' }),
	CONFIG_KEY = Symbol('config.key');

export default class ClientCoreRequestHandler extends RequestHandlerBase {
	constructor(config) {
		super();
		this[CONFIG_KEY] = config;
		logger.info(`client core resource request handler initialized; basePath: '${this.basePath}'`);
	}

	get basePath() {
		return '/core';
	}

	async handle(handlerRelativePath, req, res) {
		const filePath = handlerRelativePath === '' ? 'main.html' : handlerRelativePath;
		const contentType = findMimeType(filePath, extensionsMap.txt);

		fs.readFile(path.resolve('bin/client', filePath), (error, content) => {
			if (!error) {
				res.writeHead(200, {
					'Content-Type': contentType,
					'Cache-Control': 'private, max-age=604800'
				}).end(content);
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
	}
}