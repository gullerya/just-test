import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import Logger from '../logger/logger.js';
import { RequestHandlerBase } from './request-handler-base.js';
import { findMimeType, extensionsMap } from '../server-utils.js';

export default class RunnerLibsRequestHandler extends RequestHandlerBase {
	#logger = new Logger({ context: 'handler lib' });
	#requirer = createRequire(import.meta.url);

	constructor() {
		super();
		this.#logger.info(`lib requests handler initialized; basePath: '${this.basePath}'`);
	}

	get basePath() {
		return 'libs';
	}

	async handle(handlerRelativePath, req, res) {
		if (req.method !== 'GET') {
			this.#logger.warn(`sending 403 for '${req.method} ${this.basePath}/${handlerRelativePath}'`);
			res.writeHead(403).end();
			return;
		}

		try {
			const filePath = this.#requirer.resolve(handlerRelativePath);

			this.#logger.info(`serving '${filePath}' for '${handlerRelativePath}'`);

			const contentType = findMimeType(filePath, extensionsMap.js);
			const content = await fs.readFile(filePath, { encoding: 'utf-8' });
			res.writeHead(200, {
				'Content-Type': contentType,
				'Cache-Control': 'public, max-age=604800'
			}).end(content);
		} catch (error) {
			if (error.code === 'ENOENT') {
				this.#logger.warn(`sending 404 for '${handlerRelativePath}'`);
				res.writeHead(404).end();
			} else {
				throw error;
			}
		}

		return true;
	}

	extractLibName(libPath) {
		let result = libPath;
		const i = libPath.indexOf('/');
		if (i > 0) {
			result = libPath.substring(0, i);
		}
		return result;
	}
}