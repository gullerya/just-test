import { test } from '@gullerya/just-test';
import { assert } from '@gullerya/just-test/assert';
import UIRequestHandler from '../../../src/server/handlers/ui-request-handler.ts';
import { mockReq, mockRes, waitForResponse } from './_http-fakes.ts';

//	UIRequestHandler serves files from ./bin/ui via GET. The '' path
//	resolves to 'app.html'. Build must have produced bin/ui/*.

test('UIRequestHandler - construction sets basePath to "ui"', () => {
	const h = new UIRequestHandler({});
	assert.strictEqual(h.basePath, 'ui');
});

test('UIRequestHandler - non-GET returns 403', async () => {
	const h = new UIRequestHandler({});
	const res = mockRes();
	await h.handle('app.html', mockReq({ method: 'POST', url: '/ui/app.html' }), res as any);
	assert.strictEqual(res.statusCode, 403);
	assert.isTrue(res.ended);
});

test('UIRequestHandler - DELETE returns 403', async () => {
	const h = new UIRequestHandler({});
	const res = mockRes();
	await h.handle('app.html', mockReq({ method: 'DELETE', url: '/ui/app.html' }), res as any);
	assert.strictEqual(res.statusCode, 403);
});

test('UIRequestHandler - GET "" resolves to app.html', async () => {
	const h = new UIRequestHandler({});
	const res = mockRes();
	h.handle('', mockReq({ url: '/ui' }), res as any);
	await waitForResponse(res);
	assert.strictEqual(res.statusCode, 200);
	assert.strictEqual(res.headers?.['Content-Type'], 'text/html');
	assert.strictEqual(res.headers?.['Cache-Control'], 'private, max-age=604800');
});

test('UIRequestHandler - GET existing file returns 200 with matching mime', async () => {
	const h = new UIRequestHandler({});
	const res = mockRes();
	h.handle('app.css', mockReq({ url: '/ui/app.css' }), res as any);
	await waitForResponse(res);
	assert.strictEqual(res.statusCode, 200);
	assert.strictEqual(res.headers?.['Content-Type'], 'text/css');
});

test('UIRequestHandler - GET missing file returns 404', async () => {
	const h = new UIRequestHandler({});
	const res = mockRes();
	h.handle('does-not-exist-xyz.html', mockReq({ url: '/ui/does-not-exist-xyz.html' }), res as any);
	await waitForResponse(res);
	assert.strictEqual(res.statusCode, 404);
	assert.isTrue(res.ended);
});
