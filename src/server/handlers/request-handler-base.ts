import { IncomingMessage, ServerResponse } from 'node:http';
import ts from 'typescript';
import Logger from '../../logging/logger.ts';
import { getSession } from '../sessions/sessions-service.ts';
import { ENVIRONMENT_KEYS } from '../../runner/environment-config.ts';

const logger = new Logger({ context: 'base handler' });
const basePathValidator = /^[a-z-_]+$/;

export class RequestHandlerBase {
	#tsToJsCache = {};

	constructor() {
		const bp = this.basePath;
		if (!bp || typeof bp !== 'string' || !basePathValidator.test(bp)) {
			throw new Error(`extending handler MUST provide basePath as a string matching '${basePathValidator}'`);
		}
	}

	get basePath(): string {
		return '';
	}

	async handle(_handlerRelativePath: string, _req: IncomingMessage, _res: ServerResponse): Promise<void> {
		throw new Error('implementation missing');
	}

	async enrichImportMap(reqUrl: string, result: string): Promise<string> {
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

	compileTsToJs(reqUrl: string, tsContent: string): string {
		if (!this.#tsToJsCache[reqUrl]) {
			const startTime = performance.now();
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
			logger.info(`TS '${reqUrl}' compiled to JS in ${(performance.now() - startTime).toFixed(2)} ms`);
		}

		return this.#tsToJsCache[reqUrl].outputText;
	}
}