import fs from 'node:fs/promises';
import { ClientRequest, ServerResponse, STATUS_CODES } from 'node:http';
import path from 'node:path';
import process from 'node:process';
import Logger from '../logger/logger.js';
import { RequestHandlerBase } from './request-handler-base.ts';
import { findMimeType, extensionsMap } from '../server-utils.ts';
import { getSession } from '../sessions/sessions-service.js';
import { ENVIRONMENT_KEYS } from '../../runner/environment-config.js';

export default class StaticRequestHandler extends RequestHandlerBase {
	#config;
	#logger;
	#baseFolder;

	constructor(config) {
		super();
		this.#config = config;
		this.#logger = new Logger({ context: `'static' handler` });
		this.#baseFolder = process.cwd();

		this.#logger.info(`static requests handler initialized; basePath: '${this.basePath}'`);
	}

	get config() { return this.#config; }
	get basePath() { return 'static'; }

	async handle(handlerRelativePath: string, req: ClientRequest, res: ServerResponse): Promise<void> {
		if (req.method !== 'GET') {
			this.#logger.warn(`sending 405 for '${req.method} /${handlerRelativePath}'`);
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

			const contentType = findMimeType(handlerRelativePath, extensionsMap.txt);
			res.writeHead(200, {
				'Content-Type': contentType,
				'Cache-Control': 'private, max-age=604800'
			}).end(result);
		} else {
			this.#logger.warn(`sending 404 for '${req.method} /${handlerRelativePath}'`);
			res.writeHead(404, STATUS_CODES[404]).end();
		}
	}

	async #readFile(resourcePath) {
		const fullPath = path.join(this.#baseFolder, resourcePath);
		return await fs.readFile(fullPath, { encoding: 'utf-8' });
	}
}