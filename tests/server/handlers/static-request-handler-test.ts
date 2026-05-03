import { test } from '@gullerya/just-test';
import { assert } from '@gullerya/just-test/assert';
import StaticRequestHandler from '../../../src/server/handlers/static-request-handler.ts';
import { mockReq, mockRes } from './_http-fakes.ts';

//	StaticRequestHandler serves files relative to process.cwd(). The
//	test process runs in the repo root, so any real file path under the
//	repo is addressable. GET only; .ts gets transpiled; browser-box
//	HTML templates get importmap enrichment (no-op when sesId/envId
//	query params are absent — which is the only case we cover without
//	seeding sessions-service state).

test('StaticRequestHandler - construction sets basePath to "static"', () => {
	const h = new StaticRequestHandler({});
	assert.strictEqual(h.basePath, 'static');
});

test('StaticRequestHandler - non-GET returns 405', async () => {
	const h = new StaticRequestHandler({});
	const res = mockRes();
	await h.handle('package.json', mockReq({ method: 'POST', url: '/static/package.json' }), res as any);
	assert.strictEqual(res.statusCode, 405);
	assert.isTrue(res.ended);
});

test('StaticRequestHandler - GET existing .json returns 200 with JSON mime', async () => {
	const h = new StaticRequestHandler({});
	const res = mockRes();
	await h.handle('package.json', mockReq({ url: '/static/package.json' }), res as any);
	assert.strictEqual(res.statusCode, 200);
	assert.strictEqual(res.headers?.['Content-Type'], 'application/json');
	assert.strictEqual(res.headers?.['Cache-Control'], 'private, max-age=604800');
	const parsed = JSON.parse(res.body);
	assert.strictEqual(parsed.name, '@gullerya/just-test');
});

test('StaticRequestHandler - GET .ts goes through compileTsToJs and sets JS mime', async () => {
	const h = new StaticRequestHandler({});
	const res = mockRes();
	//	src/common/constants.ts is small, stable, has no relative imports
	await h.handle('src/common/constants.ts', mockReq({ url: '/static/src/common/constants.ts' }), res as any);
	assert.strictEqual(res.statusCode, 200);
	assert.strictEqual(res.headers?.['Content-Type'], 'text/javascript');
	assert.isTrue(typeof res.body === 'string' && res.body.length > 0);
	//	TS syntax stripped — the file defines `STATUS` as a const object
	assert.isTrue(res.body.includes('STATUS'));
});

test('StaticRequestHandler - GET browser-session-box.html goes through enrichImportMap (no-op without sesId/envId)', async () => {
	const h = new StaticRequestHandler({});
	const res = mockRes();
	//	the raw file exists under src/runner/environments/browser/
	await h.handle(
		'src/runner/environments/browser/browser-session-box.html',
		mockReq({ url: '/static/src/runner/environments/browser/browser-session-box.html' }),
		res as any
	);
	assert.strictEqual(res.statusCode, 200);
	assert.strictEqual(res.headers?.['Content-Type'], 'text/html');
	//	placeholder remains — enrichImportMap is a no-op without query params
	assert.isTrue(typeof res.body === 'string');
	assert.isTrue(res.body.includes('IMPORT_MAP_PLACEHOLDER'));
});

test('StaticRequestHandler - GET missing file propagates the ENOENT', async () => {
	const h = new StaticRequestHandler({});
	const res = mockRes();
	//	#readFile uses fs/promises.readFile which rejects on ENOENT
	//	instead of returning null — the handler's `if (responseBody)`
	//	branch is unreachable that way. The rejection bubbles up; the
	//	dispatcher (server-service) turns it into a 500. We assert the
	//	raised error here; dispatcher behavior is Slice 2.
	let caught: any = null;
	try {
		await h.handle('does-not-exist-xyz.json', mockReq({ url: '/static/does-not-exist-xyz.json' }), res as any);
	} catch (e) {
		caught = e;
	}
	assert.isTrue(caught instanceof Error);
	assert.strictEqual((caught as any).code, 'ENOENT');
});
