import { test } from '@gullerya/just-test';
import { assert } from '@gullerya/just-test/assert';
import CoreRequestHandler from '../../../src/server/handlers/core-request-handler.ts';
import { mockReq, mockRes } from './_http-fakes.ts';

//	CoreRequestHandler serves files from the project's `bin/` area
//	(joined from __dirname/../..). Structurally mirrors
//	StaticRequestHandler but scoped to the built runtime assets.

test('CoreRequestHandler - construction sets basePath to "core"', () => {
	const h = new CoreRequestHandler({});
	assert.strictEqual(h.basePath, 'core');
});

test('CoreRequestHandler - non-GET returns 405', async () => {
	const h = new CoreRequestHandler({});
	const res = mockRes();
	await h.handle('runner/just-test.js', mockReq({ method: 'POST', url: '/core/runner/just-test.js' }), res as any);
	assert.strictEqual(res.statusCode, 405);
	assert.isTrue(res.ended);
});

test('CoreRequestHandler - GET existing .ts transpiles and returns 200 with JS mime', async () => {
	const h = new CoreRequestHandler({});
	const res = mockRes();
	//	#baseFolder is join(__dirname, '../../..') — resolves to the
	//	directory containing core-request-handler's parent-parent. When
	//	handle is loaded from source (as it is under tests), that's
	//	`…/just-test/src/`; when loaded from the built bin/, it's
	//	`…/just-test/bin/`. Either way, `runner/just-test.(ts|js)` is
	//	a stable, existing sibling — we target the .ts since this test
	//	file runs from source.
	await h.handle('runner/just-test.ts', mockReq({ url: '/core/runner/just-test.ts' }), res as any);
	assert.strictEqual(res.statusCode, 200);
	assert.strictEqual(res.headers?.['Content-Type'], 'text/javascript');
	assert.strictEqual(res.headers?.['Cache-Control'], 'private, max-age=604800');
	assert.isTrue(typeof res.body === 'string' && res.body.length > 0);
});

test('CoreRequestHandler - GET missing file returns 404', async () => {
	const h = new CoreRequestHandler({});
	const res = mockRes();
	await h.handle('does-not-exist-xyz.js', mockReq({ url: '/core/does-not-exist-xyz.js' }), res as any);
	assert.strictEqual(res.statusCode, 404);
	assert.isTrue(res.ended);
});
