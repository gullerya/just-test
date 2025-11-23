import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { IncomingMessage, ServerResponse, STATUS_CODES } from 'node:http';
import { join } from 'node:path';
import Logger from '../logger/logger.js';
import { RequestHandlerBase } from './request-handler-base.ts';
import { findMimeType, EXT_TO_MIME_MAP } from '../server-utils.ts';
import { getSession } from '../sessions/sessions-service.js';
import { ENVIRONMENT_KEYS } from '../../runner/environment-config.js';

export default class CoreRequestHandler extends RequestHandlerBase {
	#config;
	#logger;
	#baseFolder;

	constructor(config) {
		super();
		this.#config = config;
		this.#logger = new Logger({ context: `'core' handler` });
		this.#baseFolder = join(fileURLToPath(import.meta.url), '../../..');

		this.#logger.info(`core requests handler initialized; basePath: '${this.basePath}'`);
	}

	get config() { return this.#config; }
	get basePath() { return 'core'; }

	async handle(handlerRelativePath: string, req: IncomingMessage, res: ServerResponse): Promise<void> {
		if (req.method !== 'GET') {
			this.#logger.warn(`sending 405 for '${req.method} ${this.basePath}/${handlerRelativePath}'`);
			res.writeHead(405, STATUS_CODES[405]).end();
			return;
		}

		let result = await this.#readFile(handlerRelativePath);
		if (result) {
			if (handlerRelativePath.match(/browser-(session|test)-box\.html$/)) {
				const sp = new URL(req.url, 'http://localhost').searchParams;
				const sesId = sp.get(ENVIRONMENT_KEYS.SESSION_ID);
				const envId = sp.get(ENVIRONMENT_KEYS.ENVIRONMENT_ID);
				if (sesId && envId) {
					const session = await getSession(sesId);
					const importMap = session.config.environments[envId].browser.importmap;
					if (importMap) {
						result = result.replace(
							'<!--IMPORT_MAP_PLACEHOLDER-->',
							`<script type="importmap">${JSON.stringify(importMap)}</script>`
						);
					}
				}
			}

			const contentType = findMimeType(handlerRelativePath, EXT_TO_MIME_MAP.txt);
			res.writeHead(200, {
				'Content-Type': contentType,
				'Cache-Control': 'private, max-age=604800'
			}).end(result);
		} else {
			this.#logger.warn(`sending 404 for '${req.method} ${this.basePath}/${handlerRelativePath}'`);
			res.writeHead(404, STATUS_CODES[404]).end();
		}
	}

	async #readFile(resourcePath: string): Promise<string> {
		const fullPath = join(this.#baseFolder, resourcePath);
		return await readFile(fullPath, { encoding: 'utf-8' });
	}
}