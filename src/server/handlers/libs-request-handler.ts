import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { IncomingMessage, ServerResponse, STATUS_CODES } from 'node:http';
import Logger from '../logger/logger.js';
import { RequestHandlerBase } from './request-handler-base.ts';
import { findMimeType, EXT_TO_MIME_MAP } from '../server-utils.ts';

export default class RunnerLibsRequestHandler extends RequestHandlerBase {
	#logger = new Logger({ context: 'handler libs' });

	constructor() {
		super();
		this.#logger.info(`libs requests handler initialized; basePath: '${this.basePath}'`);
	}

	get basePath() {
		return 'libs';
	}

	async handle(handlerRelativePath: string, req: IncomingMessage, res: ServerResponse): Promise<void> {
		if (req.method !== 'GET') {
			this.#logger.warn(`sending 405 for '${req.method} ${this.basePath}/${handlerRelativePath}'`);
			res.writeHead(405).end(STATUS_CODES[405]);
			return;
		}

		try {
			const filePath = join('node_modules', handlerRelativePath);

			this.#logger.info(`serving '${filePath}' for '${handlerRelativePath}'`);

			let content = await readFile(filePath, { encoding: 'utf-8' });
			let contentType: string;
			if (handlerRelativePath.endsWith('.ts')) {
				content = this.compileTsToJs(req.url, content);
				contentType = EXT_TO_MIME_MAP.js;
			} else {
				contentType = findMimeType(handlerRelativePath, EXT_TO_MIME_MAP.js);
			}

			res.writeHead(200, {
				'Content-Type': contentType,
				'Cache-Control': 'public, max-age=604800'
			}).end(content);
		} catch (error) {
			if (error.code === 'ENOENT') {
				this.#logger.warn(`sending 404 for '${req.method} ${this.basePath}/${handlerRelativePath}'`);
				res.writeHead(404).end();
			} else {
				throw error;
			}
		}
	}
}