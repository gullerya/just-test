//	Minimal IncomingMessage / ServerResponse fakes for handler tests.
//	Just enough surface for what the handlers actually touch; nothing
//	more. If a handler starts using a new property, add it here — don't
//	reach for a heavier mock library.

import { EventEmitter } from 'node:events';

export type CapturedWriteHead = {
	statusCode: number;
	statusMessage?: string;
	headers?: Record<string, string>;
};

export interface FakeResponse {
	writeHead(statusCode: number, headersOrMessage?: any, headers?: any): FakeResponse;
	end(body?: any): void;
	readonly writeHeadCalls: CapturedWriteHead[];
	readonly endCalls: any[];
	readonly statusCode: number | null;
	readonly body: any;
	readonly headers: Record<string, string> | null;
	readonly ended: boolean;
}

export function mockRes(): FakeResponse {
	const writeHeadCalls: CapturedWriteHead[] = [];
	const endCalls: any[] = [];
	let ended = false;
	const res: FakeResponse = {
		writeHead(statusCode: number, headersOrMessage?: any, headers?: any) {
			let statusMessage: string | undefined;
			let hdrs: Record<string, string> | undefined;
			if (typeof headersOrMessage === 'string') {
				statusMessage = headersOrMessage;
				hdrs = headers;
			} else {
				hdrs = headersOrMessage;
			}
			writeHeadCalls.push({ statusCode, statusMessage, headers: hdrs });
			return res;
		},
		end(body?: any) {
			endCalls.push(body);
			ended = true;
		},
		get writeHeadCalls() { return writeHeadCalls; },
		get endCalls() { return endCalls; },
		get statusCode() {
			return writeHeadCalls.length ? writeHeadCalls[writeHeadCalls.length - 1].statusCode : null;
		},
		get body() {
			return endCalls.length ? endCalls[endCalls.length - 1] : null;
		},
		get headers() {
			return writeHeadCalls.length ? writeHeadCalls[writeHeadCalls.length - 1].headers ?? null : null;
		},
		get ended() { return ended; }
	};
	return res;
}

export interface MockReqOptions {
	method?: string;
	url?: string;
	body?: string;
}

//	IncomingMessage extends stream.Readable. Handlers that call
//	`readJsonBody` register 'data'/'end'/'error' listeners, so an
//	EventEmitter with a queued emit() is sufficient — no real stream
//	semantics needed.
export function mockReq(opts: MockReqOptions = {}): any {
	const ee: any = new EventEmitter();
	ee.method = opts.method ?? 'GET';
	ee.url = opts.url ?? '/';
	ee.emitBody = () => {
		if (opts.body !== undefined) {
			ee.emit('data', opts.body);
		}
		ee.emit('end');
	};
	return ee;
}

//	UIRequestHandler schedules a `fs.readFile` callback from inside
//	handle(); handle() resolves before the callback lands on the
//	response. Callers need to await the res.end() side effect.
export async function waitForResponse(res: FakeResponse, timeoutMs = 2000): Promise<void> {
	const start = Date.now();
	while (!res.ended) {
		if (Date.now() - start > timeoutMs) {
			throw new Error(`response not ended within ${timeoutMs}ms`);
		}
		await new Promise(r => setTimeout(r, 5));
	}
}
