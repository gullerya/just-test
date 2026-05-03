import { test } from '@gullerya/just-test';
import { assert } from '@gullerya/just-test/assert';
import APIRequestHandler from '../../../src/server/handlers/api-request-handler.ts';
import { getAll } from '../../../src/server/sessions/sessions-service.ts';
import { mockReq, mockRes } from './_http-fakes.ts';

//	APIRequestHandler owns routing + per-route handler logic.
//
//	sessions-service holds session state in a module-level record; we
//	get a live reference via `getAll()` and seed/clean per test. That
//	keeps the tests hermetic without adding an injection seam.
//
//	#createSession calls addSession which spawns real environments, so
//	that path is NOT covered here — it's the one route that would need
//	either a dependency-injection refactor or a real surrogate server.

type MutableSessions = Record<string, any>;

async function seedSession(id: string, config: any): Promise<() => Promise<void>> {
	const all = await getAll() as unknown as MutableSessions;
	all[id] = {
		id,
		config,
		result: null,
		resultReady: false
	};
	return async () => {
		const live = await getAll() as unknown as MutableSessions;
		delete live[id];
	};
}

//	-----------------------------------------------------------------
//	construction + routing
//	-----------------------------------------------------------------

test('APIRequestHandler - construction sets basePath to "api"', () => {
	const h = new APIRequestHandler({});
	assert.strictEqual(h.basePath, 'api');
});

test('APIRequestHandler - config getter returns what was passed in', () => {
	const cfg = { foo: 'bar' };
	const h = new APIRequestHandler(cfg);
	assert.strictEqual(h.config, cfg);
});

test('APIRequestHandler - unknown path returns 404', async () => {
	const h = new APIRequestHandler({});
	const res = mockRes();
	await h.handle('v1/unknown', mockReq({ method: 'GET', url: '/api/v1/unknown' }), res as any);
	assert.strictEqual(res.statusCode, 404);
	assert.isTrue(res.ended);
});

test('APIRequestHandler - method mismatch on known path returns 404', async () => {
	const h = new APIRequestHandler({});
	const res = mockRes();
	//	/v1/sessions accepts GET and POST; PUT should not match
	await h.handle('v1/sessions', mockReq({ method: 'PUT', url: '/api/v1/sessions' }), res as any);
	assert.strictEqual(res.statusCode, 404);
});

test('APIRequestHandler - trailing-slash path does not match (strict regex)', async () => {
	const h = new APIRequestHandler({});
	const res = mockRes();
	//	route pattern is anchored ^…$; a trailing slash breaks the match
	await h.handle('v1/sessions/', mockReq({ method: 'GET', url: '/api/v1/sessions/' }), res as any);
	assert.strictEqual(res.statusCode, 404);
});

//	-----------------------------------------------------------------
//	GET /v1/sessions — getAllSessions
//	-----------------------------------------------------------------

test('GET /v1/sessions - returns 200 with JSON body of all sessions', async () => {
	const h = new APIRequestHandler({});
	const res = mockRes();
	await h.handle('v1/sessions', mockReq({ method: 'GET', url: '/api/v1/sessions' }), res as any);
	assert.strictEqual(res.statusCode, 200);
	assert.strictEqual(res.headers?.['Content-Type'], 'application/json');
	const parsed = JSON.parse(res.body);
	assert.isTrue(parsed !== null && typeof parsed === 'object');
});

//	-----------------------------------------------------------------
//	GET /v1/sessions/interactive
//	-----------------------------------------------------------------

test('GET /v1/sessions/interactive - returns null when no sessions exist', async () => {
	//	clean state: remove any seeded leftovers from other tests
	const all = await getAll() as unknown as MutableSessions;
	const prior = { ...all };
	for (const k of Object.keys(all)) { delete all[k]; }
	try {
		const h = new APIRequestHandler({});
		const res = mockRes();
		await h.handle('v1/sessions/interactive', mockReq({ url: '/api/v1/sessions/interactive' }), res as any);
		assert.strictEqual(res.statusCode, 200);
		assert.strictEqual(res.body, 'null');
	} finally {
		Object.assign(all, prior);
	}
});

test('GET /v1/sessions/interactive - returns id when exactly one session has an interactive environment', async () => {
	const all = await getAll() as unknown as MutableSessions;
	const prior = { ...all };
	for (const k of Object.keys(all)) { delete all[k]; }
	const cleanup = await seedSession('i-ses', {
		environments: {
			'env-a': { interactive: true }
		}
	});
	try {
		const h = new APIRequestHandler({});
		const res = mockRes();
		await h.handle('v1/sessions/interactive', mockReq({ url: '/api/v1/sessions/interactive' }), res as any);
		assert.strictEqual(res.statusCode, 200);
		const parsed = JSON.parse(res.body);
		assert.strictEqual(parsed.id, 'i-ses');
	} finally {
		await cleanup();
		Object.assign(all, prior);
	}
});

test('GET /v1/sessions/interactive - returns null when the single session has no interactive env', async () => {
	const all = await getAll() as unknown as MutableSessions;
	const prior = { ...all };
	for (const k of Object.keys(all)) { delete all[k]; }
	const cleanup = await seedSession('n-ses', {
		environments: {
			'env-a': { node: true }
		}
	});
	try {
		const h = new APIRequestHandler({});
		const res = mockRes();
		await h.handle('v1/sessions/interactive', mockReq({ url: '/api/v1/sessions/interactive' }), res as any);
		assert.strictEqual(res.statusCode, 200);
		assert.strictEqual(res.body, 'null');
	} finally {
		await cleanup();
		Object.assign(all, prior);
	}
});

test('GET /v1/sessions/interactive - returns null when multiple sessions exist (single-session-only guard)', async () => {
	const all = await getAll() as unknown as MutableSessions;
	const prior = { ...all };
	for (const k of Object.keys(all)) { delete all[k]; }
	const c1 = await seedSession('a-ses', { environments: { e: { interactive: true } } });
	const c2 = await seedSession('b-ses', { environments: { e: { interactive: true } } });
	try {
		const h = new APIRequestHandler({});
		const res = mockRes();
		await h.handle('v1/sessions/interactive', mockReq({ url: '/api/v1/sessions/interactive' }), res as any);
		assert.strictEqual(res.statusCode, 200);
		assert.strictEqual(res.body, 'null');
	} finally {
		await c1();
		await c2();
		Object.assign(all, prior);
	}
});

//	-----------------------------------------------------------------
//	GET /v1/sessions/:sesId/result
//	-----------------------------------------------------------------

test('GET /v1/sessions/:sesId/result - unknown sesId returns 404', async () => {
	const h = new APIRequestHandler({});
	const res = mockRes();
	await h.handle('v1/sessions/no-such/result', mockReq({ url: '/api/v1/sessions/no-such/result' }), res as any);
	assert.strictEqual(res.statusCode, 404);
	assert.isTrue(String(res.body).includes("session 'no-such' not found"));
});

test('GET /v1/sessions/:sesId/result - returns 204 while resultReady is false', async () => {
	const cleanup = await seedSession('pending', { environments: {} });
	try {
		const h = new APIRequestHandler({});
		const res = mockRes();
		await h.handle('v1/sessions/pending/result', mockReq({ url: '/api/v1/sessions/pending/result' }), res as any);
		assert.strictEqual(res.statusCode, 204);
	} finally {
		await cleanup();
	}
});

test('GET /v1/sessions/:sesId/result - returns 204 even when result is populated but resultReady=false (race guard)', async () => {
	const cleanup = await seedSession('racing', { environments: {} });
	const all = await getAll() as unknown as MutableSessions;
	all['racing'].result = { populated: true };
	//	resultReady intentionally stays false — the endpoint must
	//	hide the result to prevent a polling race
	try {
		const h = new APIRequestHandler({});
		const res = mockRes();
		await h.handle('v1/sessions/racing/result', mockReq({ url: '/api/v1/sessions/racing/result' }), res as any);
		assert.strictEqual(res.statusCode, 204);
	} finally {
		await cleanup();
	}
});

test('GET /v1/sessions/:sesId/result - returns 200 with body when resultReady is true', async () => {
	const cleanup = await seedSession('done', { environments: {} });
	const all = await getAll() as unknown as MutableSessions;
	all['done'].result = { ok: true };
	all['done'].resultReady = true;
	try {
		const h = new APIRequestHandler({});
		const res = mockRes();
		await h.handle('v1/sessions/done/result', mockReq({ url: '/api/v1/sessions/done/result' }), res as any);
		assert.strictEqual(res.statusCode, 200);
		assert.strictEqual(res.headers?.['Content-Type'], 'application/json');
		assert.deepEqual(JSON.parse(res.body), { ok: true });
	} finally {
		await cleanup();
	}
});

//	-----------------------------------------------------------------
//	GET /v1/sessions/:sesId/environments/:envId/metadata
//	-----------------------------------------------------------------

test('GET env metadata - unknown sesId returns 404', async () => {
	const h = new APIRequestHandler({});
	const res = mockRes();
	await h.handle(
		'v1/sessions/nope/environments/e/metadata',
		mockReq({ url: '/api/v1/sessions/nope/environments/e/metadata' }),
		res as any
	);
	assert.strictEqual(res.statusCode, 404);
	assert.isTrue(String(res.body).includes("session 'nope' not found"));
});

test('GET env metadata - unknown envId in known session returns 404', async () => {
	const cleanup = await seedSession('s1', { environments: { 'real-env': { node: true, tests: { include: [], exclude: [] } } } });
	try {
		const h = new APIRequestHandler({});
		const res = mockRes();
		await h.handle(
			'v1/sessions/s1/environments/no-such/metadata',
			mockReq({ url: '/api/v1/sessions/s1/environments/no-such/metadata' }),
			res as any
		);
		assert.strictEqual(res.statusCode, 404);
		assert.isTrue(String(res.body).includes("environment 'no-such' not found"));
	} finally {
		await cleanup();
	}
});

//	-----------------------------------------------------------------
//	POST /v1/sessions/:sesId/environments/:envId/result
//	-----------------------------------------------------------------

test('POST env result - unknown sesId causes storeResult to throw', async () => {
	const h = new APIRequestHandler({});
	const res = mockRes();
	const req = mockReq({ method: 'POST', url: '/api/v1/sessions/missing/environments/e/result', body: '{}' });
	const p = h.handle('v1/sessions/missing/environments/e/result', req, res as any);
	req.emitBody();
	let caught: any = null;
	try {
		await p;
	} catch (e) {
		caught = e;
	}
	assert.isTrue(caught instanceof Error);
	assert.isTrue(String(caught.message).includes("session ID 'missing' not exists"));
});

test('POST env result - malformed JSON body rejects the handler', async () => {
	const h = new APIRequestHandler({});
	const res = mockRes();
	const req = mockReq({ method: 'POST', url: '/api/v1/sessions/x/environments/e/result', body: '{not json' });
	const p = h.handle('v1/sessions/x/environments/e/result', req, res as any);
	req.emitBody();
	let caught: any = null;
	try {
		await p;
	} catch (e) {
		caught = e;
	}
	assert.isTrue(caught instanceof SyntaxError);
});
