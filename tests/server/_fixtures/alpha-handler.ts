//	Fixture handler for server-service-test. Records invocations and
//	lets each test install per-instance behavior via the static `nextHandler`
//	hook. Kept intentionally tiny — no imports beyond the base class.

import { IncomingMessage, ServerResponse } from 'node:http';
import { RequestHandlerBase } from '../../../src/server/handlers/request-handler-base.ts';

type Invocation = { path: string; method: string };

export default class AlphaHandler extends RequestHandlerBase {
	//	A single shared hook pipes test-specific behavior into the
	//	instance that ServerService constructs (which we don't have a
	//	reference to). Tests set `AlphaHandler.nextBehavior` before
	//	sending a request and clear it after.
	static nextBehavior: ((
		path: string,
		req: IncomingMessage,
		res: ServerResponse
	) => Promise<void>) | null = null;
	static invocations: Invocation[] = [];

	get basePath(): string { return 'alpha'; }

	async handle(path: string, req: IncomingMessage, res: ServerResponse): Promise<void> {
		AlphaHandler.invocations.push({ path, method: req.method ?? '' });
		if (AlphaHandler.nextBehavior) {
			await AlphaHandler.nextBehavior(path, req, res);
		} else {
			res.writeHead(200, { 'Content-Type': 'text/plain' }).end(`alpha:${path}`);
		}
	}
}
