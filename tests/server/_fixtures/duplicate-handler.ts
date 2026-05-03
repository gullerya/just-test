//	Another handler claiming basePath='alpha' — used to trigger the
//	duplicate-basePath error path in ServerService.initHandlers.

import { IncomingMessage, ServerResponse } from 'node:http';
import { RequestHandlerBase } from '../../../src/server/handlers/request-handler-base.ts';

export default class DuplicateAlphaHandler extends RequestHandlerBase {
	get basePath(): string { return 'alpha'; }

	async handle(_path: string, _req: IncomingMessage, res: ServerResponse): Promise<void> {
		res.writeHead(200).end();
	}
}
