import fs from 'fs';
import path from 'path';
import Logger from '../logger/logger.js';
import { RequestHandlerBase } from './request-handler-base.js';
import { findMimeType, extensionsMap } from '../server-utils.js';

const
	logger = new Logger({ context: 'handler core' }),
	CONFIG_KEY = Symbol('config.key'),
	sourceRoots = ['client', 'common'];

export default class ClientCoreRequestHandler extends RequestHandlerBase {
	constructor(config) {
		super();
		this[CONFIG_KEY] = config;
		logger.info(`core requests handler initialized; basePath: '${this.basePath}'`);
	}

	get basePath() {
		return '/core';
	}

	async handle(handlerRelativePath, req, res) {
		if (req.method !== 'GET') {
			logger.warn(`sending 403 for '${req.method} ${this.basePath}/${handlerRelativePath}' (method forbidden)`);
			res.writeHead(403).end('method forbidden');
			return;
		}
		if (!handlerRelativePath.indexOf(sourceRoots[0]) === 0 &&
			!handlerRelativePath.indexOf(sourceRoots[1]) === 0) {
			logger.warn(`sending 403 for '${req.method} ${this.basePath}/${handlerRelativePath}' (base path forbidden)`);
			res.writeHead(403).end('base path forbidden');
			return;
		}

		const result = await this._readFile('bin', handlerRelativePath);
		if (result) {
			const contentType = findMimeType(handlerRelativePath, extensionsMap.txt);
			res.writeHead(200, {
				'Content-Type': contentType,
				'Cache-Control': 'private, max-age=604800'
			}).end(result);
		} else {
			logger.warn(`sending 404 for '${handlerRelativePath}'`);
			res.writeHead(404).end();
		}
	}

	async _readFile(sourceRoot, resourcePath) {
		const result = await new Promise(r => {
			const fullPath = path.join(sourceRoot, resourcePath);
			fs.readFile(fullPath, (error, content) => {
				if (error) {
					logger.error(`errored while reading resource from '${fullPath}':`, error);
				}
				r(content);
			});
		});
		return result;
	}
}