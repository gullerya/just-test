import fs from 'node:fs/promises';
import url from 'node:url';
import path from 'node:path';
import Logger from '../logger/logger.js';
import { RequestHandlerBase } from './request-handler-base.js';
import { findMimeType, extensionsMap } from '../server-utils.js';
import { getSession } from '../sessions/sessions-service.js';
import { ENVIRONMENT_KEYS } from '../../runner/environment-config.js';

export default class RunnerCoreRequestHandler extends RequestHandlerBase {
	#config;
	#logger;
	#baseFolder;
	#allowedRoots = ['runner', 'common'];

	constructor(config) {
		super();
		this.#config = config;
		this.#baseFolder = path.join(url.fileURLToPath(import.meta.url), '../../..');
		this.#logger = new Logger({ context: 'handler core' });

		this.#logger.info(`core requests handler initialized; basePath: '${this.basePath}'`);
	}

	get basePath() {
		return 'core';
	}

	async handle(handlerRelativePath, req, res) {
		if (req.method !== 'GET') {
			this.#logger.warn(`sending 403 for '${req.method} ${this.basePath}/${handlerRelativePath}' (method forbidden)`);
			res.writeHead(403).end('method forbidden');
			return;
		}
		if (!handlerRelativePath.indexOf(this.#allowedRoots[0]) === 0 &&
			!handlerRelativePath.indexOf(this.#allowedRoots[1]) === 0) {
			this.#logger.warn(`sending 403 for '${req.method} ${this.basePath}/${handlerRelativePath}' (base path forbidden)`);
			res.writeHead(403).end('base path forbidden');
			return;
		}

		let result = await this.#readFile(handlerRelativePath);
		if (result) {
			if (handlerRelativePath.endsWith('box.html')) {
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
			this.#logger.warn(`sending 404 for '${handlerRelativePath}'`);
			res.writeHead(404).end();
		}
	}

	async #readFile(resourcePath) {
		let result = null;
		const fullPath = path.join(this.#baseFolder, resourcePath);
		try {
			result = await fs.readFile(fullPath, { encoding: 'utf-8' });
		} catch (e) {
			this.#logger.error(`errored while reading resource from '${fullPath}':`, e);
		}
		return result;
	}
}