//	Fixture with basePath='ui' — lets us assert the '/' → '/ui' default
//	routing in server-service without pulling the real UIRequestHandler
//	(which reads files off disk).

import { IncomingMessage, ServerResponse } from 'node:http';
import { RequestHandlerBase } from '../../../src/server/handlers/request-handler-base.ts';

export default class FakeUIHandler extends RequestHandlerBase {
	static invocations: { path: string; method: string }[] = [];

	get basePath(): string { return 'ui'; }

	async handle(path: string, req: IncomingMessage, res: ServerResponse): Promise<void> {
		FakeUIHandler.invocations.push({ path, method: req.method ?? '' });
		res.writeHead(200, { 'Content-Type': 'text/plain' }).end(`ui:${path}`);
	}
}
