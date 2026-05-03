import { test } from '@gullerya/just-test';
import { assert } from '@gullerya/just-test/assert';
import LibsRequestHandler from '../../../src/server/handlers/libs-request-handler.ts';
import { mockReq, mockRes } from './_http-fakes.ts';

//	LibsRequestHandler serves files from ./node_modules via GET only.
//	Tests drive real filesystem reads against real node_modules entries
//	(typescript ships its own .d.ts/.js we can target deterministically).

test('LibsRequestHandler - construction sets basePath to "libs"', () => {
	const h = new LibsRequestHandler();
	assert.strictEqual(h.basePath, 'libs');
});

test('LibsRequestHandler - non-GET method returns 405', async () => {
	const h = new LibsRequestHandler();
	const res = mockRes();
	await h.handle('typescript/package.json', mockReq({ method: 'POST', url: '/libs/typescript/package.json' }), res as any);
	assert.strictEqual(res.statusCode, 405);
	assert.isTrue(res.ended);
});

test('LibsRequestHandler - PUT returns 405', async () => {
	const h = new LibsRequestHandler();
	const res = mockRes();
	await h.handle('typescript/package.json', mockReq({ method: 'PUT', url: '/libs/x' }), res as any);
	assert.strictEqual(res.statusCode, 405);
});

test('LibsRequestHandler - GET existing .json returns 200 with JSON mime + cache header', async () => {
	const h = new LibsRequestHandler();
	const res = mockRes();
	await h.handle('typescript/package.json', mockReq({ url: '/libs/typescript/package.json' }), res as any);
	assert.strictEqual(res.statusCode, 200);
	assert.strictEqual(res.headers?.['Content-Type'], 'application/json');
	assert.strictEqual(res.headers?.['Cache-Control'], 'public, max-age=604800');
	//	body must be a JSON string that parses and contains typescript's name
	const parsed = JSON.parse(res.body);
	assert.strictEqual(parsed.name, 'typescript');
});

test('LibsRequestHandler - GET missing path returns 404', async () => {
	const h = new LibsRequestHandler();
	const res = mockRes();
	await h.handle('typescript/does-not-exist-xyz.json', mockReq({ url: '/libs/typescript/does-not-exist-xyz.json' }), res as any);
	assert.strictEqual(res.statusCode, 404);
	assert.isTrue(res.ended);
});

test('LibsRequestHandler - GET .ts file goes through compileTsToJs and sets JS mime', async () => {
	const h = new LibsRequestHandler();
	const res = mockRes();
	//	typescript ships lib.d.ts files — pick one that exists reliably
	//	across versions. If this ever breaks, swap for any .ts under
	//	node_modules that's stable across the supported ts range.
	const reqUrl = '/libs/typescript/lib/typescript.d.ts';
	await h.handle('typescript/lib/typescript.d.ts', mockReq({ url: reqUrl }), res as any);
	assert.strictEqual(res.statusCode, 200);
	assert.strictEqual(res.headers?.['Content-Type'], 'text/javascript');
	//	transpile output is a string; we don't assert content since the
	//	.d.ts is huge — presence + mime is the contract
	assert.isTrue(typeof res.body === 'string');
});
