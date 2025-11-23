import { readFile } from 'node:fs/promises';
import { IncomingMessage, ServerResponse, STATUS_CODES } from 'node:http';
import { join } from 'node:path';
import { cwd } from 'node:process';
import Logger from '../logger/logger.js';
import { RequestHandlerBase } from './request-handler-base.ts';
import { findMimeType, EXT_TO_MIME_MAP } from '../server-utils.ts';
import { getSession } from '../sessions/sessions-service.js';
import { ENVIRONMENT_KEYS } from '../../runner/environment-config.js';
import ts from 'typescript';

export default class StaticRequestHandler extends RequestHandlerBase {
	#config;
	#logger;
	#baseFolder;
	#tsToJsCache = {};

	constructor(config) {
		super();
		this.#config = config;
		this.#logger = new Logger({ context: `'static' handler` });
		this.#baseFolder = cwd();

		this.#logger.info(`static requests handler initialized; basePath: '${this.basePath}'`);
	}

	get config() { return this.#config; }
	get basePath() { return 'static'; }

	async handle(handlerRelativePath: string, req: IncomingMessage, res: ServerResponse): Promise<void> {
		if (req.method !== 'GET') {
			this.#logger.warn(`sending 405 for '${req.method} /${handlerRelativePath}'`);
			res.writeHead(405, STATUS_CODES[405]).end();
			return;
		}

		let responseBody = await this.#readFile(handlerRelativePath);
		let contentType: string;
		if (responseBody) {
			if (handlerRelativePath.match(/browser-(session|test)-box\.html$/)) {
				responseBody = await this.#enrichImportMap(req.url, responseBody);
			} else if (handlerRelativePath.endsWith('.ts')) {
				responseBody = this.#compileTsToJs(req.url, responseBody);
				contentType = EXT_TO_MIME_MAP.js;
			} else {
				contentType = findMimeType(handlerRelativePath, EXT_TO_MIME_MAP.txt);
			}

			res.writeHead(200, {
				'Content-Type': contentType,
				'Cache-Control': 'private, max-age=604800'
			}).end(responseBody);
		} else {
			this.#logger.warn(`sending 404 for '${req.method} /${handlerRelativePath}'`);
			res.writeHead(404, STATUS_CODES[404]).end();
		}
	}

	async #readFile(resourcePath: string): Promise<string> {
		const fullPath = join(this.#baseFolder, resourcePath);
		return await readFile(fullPath, { encoding: 'utf-8' });
	}

	async #enrichImportMap(reqUrl: string, result: string): Promise<string> {
		const sp = new URL(reqUrl, 'http://localhost').searchParams;
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
		return result;
	}

	#compileTsToJs(reqUrl: string, tsContent: string): string {
		if (!this.#tsToJsCache[reqUrl]) {
			let startTime = performance.now();
			const transpilationResult = ts.transpileModule(tsContent, {
				compilerOptions: {
					module: ts.ModuleKind.ES2022,
					target: ts.ScriptTarget.ES2022,
					isolatedModules: true,
					allowNonTsExtensions: true,
					sourceMap: true,
					noLib: true,
					noResolve: true
				},
			});
			this.#tsToJsCache[reqUrl] = transpilationResult;
			this.#logger.info(`TypeScript file '${reqUrl}' compiled to JavaScript: took ${(performance.now() - startTime).toFixed(2)} ms`);
		}

		return this.#tsToJsCache[reqUrl].outputText;
	}
}