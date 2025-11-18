import fs from 'node:fs';
import path from 'node:path';
import { ClientRequest, ServerResponse } from 'node:http';
import Logger from '../logger/logger.js';
import { RequestHandlerBase } from './request-handler-base.ts';
import { findMimeType, extensionsMap } from '../server-utils.ts';

const
	logger = new Logger({ context: 'handler UI' }),
	CONFIG_KEY = Symbol('config.key');

export default class UIRequestHandler extends RequestHandlerBase {
	constructor(config) {
		super();
		this[CONFIG_KEY] = config;
		logger.info(`UI requests handler initialized; basePath: '${this.basePath}'`);
	}

	get basePath() {
		return 'ui';
	}

	async handle(handlerRelativePath: string, req: ClientRequest, res: ServerResponse): Promise<void> {
		if (req.method !== 'GET') {
			logger.warn(`sending 403 for '${req.method} ${this.basePath}/${handlerRelativePath}'`);
			res.writeHead(403).end();
			return;
		}

		const filePath = handlerRelativePath === '' ? 'app.html' : handlerRelativePath;
		const contentType = findMimeType(filePath, extensionsMap.txt);

		fs.readFile(path.resolve('bin/ui', filePath), (error, content) => {
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