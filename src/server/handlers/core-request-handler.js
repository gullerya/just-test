import fs from 'node:fs/promises';
import path from 'node:path';
import { URLSearchParams } from 'node:url';
import Logger from '../logger/logger.js';
import { RequestHandlerBase } from './request-handler-base.js';
import { findMimeType, extensionsMap } from '../server-utils.js';
import { getSession } from '../sessions/sessions-service.js';
import { ENVIRONMENT_KEYS } from '../../runner/environment-config.js';

const
	logger = new Logger({ context: 'handler core' }),
	CONFIG_KEY = Symbol('config.key'),
	sourceRoots = ['runner', 'common'];

export default class RunnerCoreRequestHandler extends RequestHandlerBase {
	constructor(config) {
		super();
		this[CONFIG_KEY] = config;
		logger.info(`core requests handler initialized; basePath: '${this.basePath}'`);
	}

	get basePath() {
		return 'core';
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

		let result = await this.#readFile('bin', handlerRelativePath);
		if (result) {
			if (handlerRelativePath.endsWith('box.html')) {
				const sp = new URL(req.url, 'http://localhost').searchParams;
				const sesId = sp.get(ENVIRONMENT_KEYS.SESSION_ID);
				const envId = sp.get(ENVIRONMENT_KEYS.ENVIRONMENT_ID);
				const session = await getSession(sesId);
				const importMap = session.config.environments[envId].browser.importmap;
				if (importMap) {
					result = result.replace(
						'<!--IMPORT_MAP_PLACEHOLDER-->',
						`<script type="importmap">${JSON.stringify(importMap)}</script>`
					);
				}
			}

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

	async #readFile(sourceRoot, resourcePath) {
		let result = null;
		const fullPath = path.join(sourceRoot, resourcePath);
		try {
			result = await fs.readFile(fullPath, { encoding: 'utf-8' });
		} catch (e) {
			logger.error(`errored while reading resource from '${fullPath}':`, e);
		}
		return result;
	}
}