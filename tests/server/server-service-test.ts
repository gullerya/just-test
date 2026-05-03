import { test } from '@gullerya/just-test';
import { assert } from '@gullerya/just-test/assert';
import { ServerService } from '../../src/server/server-service.ts';
import AlphaHandler from './_fixtures/alpha-handler.ts';
import FakeUIHandler from './_fixtures/ui-handler.ts';

//	End-to-end-ish tests against ServerService: boot a real HTTP server
//	on an OS-assigned port (port: 0), fetch() against it, assert on the
//	real response. Uses fixture handler modules that record invocations
//	via static state — we don't have a reference to the instance that
//	ServerService constructs, so the hook pattern is how tests drive
//	per-case behavior.
//
//	Fixture handlers are resolved via file:// URLs built from
//	import.meta.url because ServerService.initHandlers calls
//	`await import(h)` relative to the server-service module itself —
//	test-relative paths would fail to resolve.

const alphaHandlerUrl = new URL('./_fixtures/alpha-handler.ts', import.meta.url).href;
const uiHandlerUrl = new URL('./_fixtures/ui-handler.ts', import.meta.url).href;
const duplicateHandlerUrl = new URL('./_fixtures/duplicate-handler.ts', import.meta.url).href;

async function startSurrogate(handlerUrls: string[]): Promise<ServerService> {
	const srv = new ServerService({
		port: 0,
		origin: 'http://127.0.0.1',
		handlers: handlerUrls
	});
	await srv.start();
	//	start() resolves before the 'listening' event fires — poll
	//	isRunning until the port is live. Timeout is generous to keep
	//	CI non-flaky on slow runners.
	const deadline = Date.now() + 5000;
	while (!srv.isRunning) {
		if (Date.now() > deadline) {
			throw new Error('surrogate server did not reach listening within 5s');
		}
		await new Promise(r => setTimeout(r, 10));
	}
	return srv;
}

async function stopSurrogate(srv: ServerService): Promise<void> {
	await srv.stop();
	//	ensure the stop fully completes before the next test reuses
	//	state — stopPromise resolves on the 'close' event
	if (srv.stopPromise) {
		await srv.stopPromise;
	}
}

function baseUrlOf(srv: ServerService): string {
	return `http://127.0.0.1:${srv.port}`;
}

//	-----------------------------------------------------------------
//	dispatcher routing
//	-----------------------------------------------------------------

test('ServerService - GET /alpha/foo dispatches to the alpha handler with relative path', async () => {
	AlphaHandler.invocations.length = 0;
	AlphaHandler.nextBehavior = null;
	const srv = await startSurrogate([alphaHandlerUrl]);
	try {
		const r = await fetch(`${baseUrlOf(srv)}/alpha/foo`);
		assert.strictEqual(r.status, 200);
		assert.strictEqual(await r.text(), 'alpha:foo');
		assert.strictEqual(AlphaHandler.invocations.length, 1);
		assert.strictEqual(AlphaHandler.invocations[0].path, 'foo');
		assert.strictEqual(AlphaHandler.invocations[0].method, 'GET');
	} finally {
		await stopSurrogate(srv);
	}
});

test('ServerService - GET / routes to the ui handler (empty-path default)', async () => {
	FakeUIHandler.invocations.length = 0;
	const srv = await startSurrogate([uiHandlerUrl]);
	try {
		const r = await fetch(`${baseUrlOf(srv)}/`);
		assert.strictEqual(r.status, 200);
		assert.strictEqual(await r.text(), 'ui:');
		assert.strictEqual(FakeUIHandler.invocations.length, 1);
		assert.strictEqual(FakeUIHandler.invocations[0].path, '');
	} finally {
		await stopSurrogate(srv);
	}
});

test('ServerService - GET with deep path strips basePath prefix correctly', async () => {
	AlphaHandler.invocations.length = 0;
	AlphaHandler.nextBehavior = null;
	const srv = await startSurrogate([alphaHandlerUrl]);
	try {
		const r = await fetch(`${baseUrlOf(srv)}/alpha/a/b/c`);
		assert.strictEqual(r.status, 200);
		assert.strictEqual(AlphaHandler.invocations[0].path, 'a/b/c');
	} finally {
		await stopSurrogate(srv);
	}
});

test('ServerService - unknown basePath returns 404', async () => {
	const srv = await startSurrogate([alphaHandlerUrl]);
	try {
		const r = await fetch(`${baseUrlOf(srv)}/unknown/path`);
		assert.strictEqual(r.status, 404);
	} finally {
		await stopSurrogate(srv);
	}
});

//	-----------------------------------------------------------------
//	error handling
//	-----------------------------------------------------------------

test('ServerService - handler that throws is caught and returns 500 with error message body', async () => {
	AlphaHandler.invocations.length = 0;
	AlphaHandler.nextBehavior = async () => {
		throw new Error('boom from handler');
	};
	const srv = await startSurrogate([alphaHandlerUrl]);
	try {
		const r = await fetch(`${baseUrlOf(srv)}/alpha/anything`);
		assert.strictEqual(r.status, 500);
		assert.strictEqual(await r.text(), 'boom from handler');
	} finally {
		AlphaHandler.nextBehavior = null;
		await stopSurrogate(srv);
	}
});

test('ServerService - handler that throws non-Error is caught and stringified into 500 body', async () => {
	AlphaHandler.nextBehavior = async () => {
		throw 'not-an-error-object';
	};
	const srv = await startSurrogate([alphaHandlerUrl]);
	try {
		const r = await fetch(`${baseUrlOf(srv)}/alpha/x`);
		assert.strictEqual(r.status, 500);
		assert.strictEqual(await r.text(), 'not-an-error-object');
	} finally {
		AlphaHandler.nextBehavior = null;
		await stopSurrogate(srv);
	}
});

//	-----------------------------------------------------------------
//	initHandlers invariants
//	-----------------------------------------------------------------

test('ServerService - duplicate basePath across handlers is rejected by initHandlers', async () => {
	const srv = new ServerService({
		port: 0,
		origin: 'http://127.0.0.1',
		handlers: [alphaHandlerUrl, duplicateHandlerUrl]
	});
	let caught: any = null;
	try {
		await srv.start();
	} catch (e) {
		caught = e;
	}
	assert.isTrue(caught instanceof Error);
	assert.isTrue(String(caught.message).includes(`base path 'alpha' is already registered`));
	//	server never reached listening — nothing to stop
	assert.isFalse(srv.isRunning);
});

//	-----------------------------------------------------------------
//	lifecycle — start/stop idempotency & getters
//	-----------------------------------------------------------------

test('ServerService - calling start() twice returns null on the second call', async () => {
	const srv = await startSurrogate([alphaHandlerUrl]);
	try {
		const second = await srv.start();
		assert.strictEqual(second, null);
		assert.isTrue(srv.isRunning);
	} finally {
		await stopSurrogate(srv);
	}
});

test('ServerService - stop() on a never-started server resolves immediately', async () => {
	const srv = new ServerService({
		port: 0,
		origin: 'http://127.0.0.1',
		handlers: [alphaHandlerUrl]
	});
	//	no start() call — stop must not hang or throw
	await srv.stop();
	assert.isFalse(srv.isRunning);
});

test('ServerService - after stop(), isRunning flips back to false and stopPromise resolves', async () => {
	const srv = await startSurrogate([alphaHandlerUrl]);
	assert.isTrue(srv.isRunning);
	await srv.stop();
	await srv.stopPromise;
	assert.isFalse(srv.isRunning);
});

test('ServerService - baseUrl getter returns the configured origin (not the bound port)', async () => {
	const srv = await startSurrogate([alphaHandlerUrl]);
	try {
		assert.strictEqual(srv.baseUrl, 'http://127.0.0.1');
	} finally {
		await stopSurrogate(srv);
	}
});

test('ServerService - port getter returns the OS-assigned port once listening', async () => {
	const srv = await startSurrogate([alphaHandlerUrl]);
	try {
		const p = srv.port;
		assert.isTrue(typeof p === 'number' && p > 0);
	} finally {
		await stopSurrogate(srv);
	}
});

test('ServerService - port getter returns null when server has never started', () => {
	const srv = new ServerService({
		port: 0,
		origin: 'http://127.0.0.1',
		handlers: [alphaHandlerUrl]
	});
	assert.strictEqual(srv.port, null);
});
