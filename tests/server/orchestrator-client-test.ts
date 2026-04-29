import { test } from '@gullerya/just-test';
import { assert } from '@gullerya/just-test/assert';
import { OrchestratorClient } from '../../src/server/orchestrator-client.ts';

//	Fetch stub — captures calls and returns queued responses. Restored
//	after each test via `restoreFetch()` to keep tests hermetic.
type FakeResponse = {
	status?: number;
	ok?: boolean;
	statusText?: string;
	body?: unknown;
};

type Call = { url: string; init?: RequestInit };

function installFetch(responses: FakeResponse[]): { calls: Call[]; restore: () => void } {
	const original = (globalThis as any).fetch;
	const calls: Call[] = [];
	let i = 0;
	(globalThis as any).fetch = (url: string, init?: RequestInit) => {
		calls.push({ url, init });
		const r = responses[i++];
		if (!r) {
			return Promise.reject(new Error(`no more stubbed responses (call #${i})`));
		}
		const status = r.status ?? 200;
		return Promise.resolve({
			status,
			ok: r.ok ?? (status >= 200 && status < 300),
			statusText: r.statusText ?? '',
			json: () => Promise.resolve(r.body)
		});
	};
	return {
		calls,
		restore: () => { (globalThis as any).fetch = original; }
	};
}

//	-----------------------------------------------------------------
//	construction + baseUrl normalization
//	-----------------------------------------------------------------

test('OrchestratorClient - rejects empty / non-string baseUrl', () => {
	assert.throws(() => new OrchestratorClient(''), 'baseUrl MUST be a non-empty string');
	assert.throws(() => new OrchestratorClient(null as any), 'baseUrl MUST be a non-empty string');
	assert.throws(() => new OrchestratorClient(123 as any), 'baseUrl MUST be a non-empty string');
});

test('OrchestratorClient - strips a single trailing slash from baseUrl', () => {
	const c = new OrchestratorClient('http://localhost:3000/');
	assert.strictEqual(c.baseUrl, 'http://localhost:3000');
});

test('OrchestratorClient - preserves baseUrl without trailing slash', () => {
	const c = new OrchestratorClient('http://localhost:3000');
	assert.strictEqual(c.baseUrl, 'http://localhost:3000');
});

//	-----------------------------------------------------------------
//	createSession
//	-----------------------------------------------------------------

test('createSession - POSTs JSON body to /api/v1/sessions and returns payload on 201', async () => {
	const stub = installFetch([{ status: 201, body: { sessionId: 'abc', environments: [] } }]);
	try {
		const c = new OrchestratorClient('http://h');
		const res = await c.createSession({ foo: 'bar' });
		assert.deepEqual(res, { sessionId: 'abc', environments: [] });
		assert.strictEqual(stub.calls.length, 1);
		const call = stub.calls[0];
		assert.strictEqual(call.url, 'http://h/api/v1/sessions');
		assert.strictEqual(call.init?.method, 'POST');
		const headers = call.init?.headers as Record<string, string>;
		assert.strictEqual(headers['Content-Type'], 'application/json');
		assert.strictEqual(call.init?.body, JSON.stringify({ foo: 'bar' }));
	} finally {
		stub.restore();
	}
});

test('createSession - throws with status + statusText when server replies non-201', async () => {
	const stub = installFetch([{ status: 400, statusText: 'Bad Request' }]);
	try {
		const c = new OrchestratorClient('http://h');
		const err = await c.createSession({}).then(() => null, (e: Error) => e);
		assert.isTrue(err instanceof Error);
		assert.isTrue(err!.message.includes('400'));
		assert.isTrue(err!.message.includes('Bad Request'));
	} finally {
		stub.restore();
	}
});

//	-----------------------------------------------------------------
//	pollSessionResult — discriminated-union on 200 vs 204
//	-----------------------------------------------------------------

test('pollSessionResult - validates sessionId', async () => {
	const c = new OrchestratorClient('http://h');
	//	no fetch stub needed: guards throw synchronously before fetch
	await c.pollSessionResult('' as any).then(
		() => assert.fail('expected throw'),
		(e: TypeError) => assert.isTrue(e.message.includes('sessionId MUST be a non-empty string'))
	);
	await c.pollSessionResult(null as any).then(
		() => assert.fail('expected throw'),
		(e: TypeError) => assert.isTrue(e.message.includes('sessionId MUST be a non-empty string'))
	);
});

test('pollSessionResult - 200 returns { ready: true, result }', async () => {
	const stub = installFetch([{ status: 200, body: { total: 5 } }]);
	try {
		const c = new OrchestratorClient('http://h');
		const res = await c.pollSessionResult('S1');
		assert.isTrue(res.ready);
		assert.deepEqual((res as any).result, { total: 5 });
		assert.strictEqual(stub.calls[0].url, 'http://h/api/v1/sessions/S1/result');
	} finally {
		stub.restore();
	}
});

test('pollSessionResult - 204 returns { ready: false }', async () => {
	const stub = installFetch([{ status: 204 }]);
	try {
		const c = new OrchestratorClient('http://h');
		const res = await c.pollSessionResult('S1');
		assert.deepEqual(res, { ready: false });
	} finally {
		stub.restore();
	}
});

test('pollSessionResult - other statuses throw with details', async () => {
	const stub = installFetch([{ status: 500, statusText: 'Boom' }]);
	try {
		const c = new OrchestratorClient('http://h');
		const err = await c.pollSessionResult('S1').then(() => null, (e: Error) => e);
		assert.isTrue(err!.message.includes('500'));
		assert.isTrue(err!.message.includes('Boom'));
	} finally {
		stub.restore();
	}
});

//	-----------------------------------------------------------------
//	getEnvironmentMetadata
//	-----------------------------------------------------------------

test('getEnvironmentMetadata - GETs the correct URL and returns JSON on 2xx', async () => {
	const stub = installFetch([{ status: 200, ok: true, body: { id: 'E1' } }]);
	try {
		const c = new OrchestratorClient('http://h');
		const md = await c.getEnvironmentMetadata('S1', 'E1');
		assert.deepEqual(md, { id: 'E1' } as any);
		assert.strictEqual(
			stub.calls[0].url,
			'http://h/api/v1/sessions/S1/environments/E1/metadata'
		);
		//	GET is the default — no method / body
		assert.strictEqual(stub.calls[0].init, undefined);
	} finally {
		stub.restore();
	}
});

test('getEnvironmentMetadata - throws on non-ok response', async () => {
	const stub = installFetch([{ status: 404, ok: false }]);
	try {
		const c = new OrchestratorClient('http://h');
		const err = await c.getEnvironmentMetadata('S1', 'E1').then(() => null, (e: Error) => e);
		assert.isTrue(err!.message.includes('404'));
	} finally {
		stub.restore();
	}
});

//	-----------------------------------------------------------------
//	reportEnvironmentResult
//	-----------------------------------------------------------------

test('reportEnvironmentResult - POSTs JSON body and resolves undefined on 201', async () => {
	const stub = installFetch([{ status: 201 }]);
	try {
		const c = new OrchestratorClient('http://h');
		const payload = { total: 3, pass: 3 };
		const out = await c.reportEnvironmentResult('S1', 'E1', payload);
		assert.strictEqual(out, undefined);
		const call = stub.calls[0];
		assert.strictEqual(
			call.url,
			'http://h/api/v1/sessions/S1/environments/E1/result'
		);
		assert.strictEqual(call.init?.method, 'POST');
		assert.strictEqual(call.init?.body, JSON.stringify(payload));
	} finally {
		stub.restore();
	}
});

test('reportEnvironmentResult - throws on non-201', async () => {
	const stub = installFetch([{ status: 500, statusText: 'Internal' }]);
	try {
		const c = new OrchestratorClient('http://h');
		const err = await c.reportEnvironmentResult('S1', 'E1', {}).then(
			() => null, (e: Error) => e
		);
		assert.isTrue(err!.message.includes('500'));
		assert.isTrue(err!.message.includes('Internal'));
	} finally {
		stub.restore();
	}
});

//	-----------------------------------------------------------------
//	URL composition uses the normalized baseUrl
//	-----------------------------------------------------------------

test('baseUrl trailing slash does not double up in derived endpoints', async () => {
	const stub = installFetch([{ status: 201, body: {} }]);
	try {
		const c = new OrchestratorClient('http://h/');
		await c.createSession({});
		assert.strictEqual(stub.calls[0].url, 'http://h/api/v1/sessions');
	} finally {
		stub.restore();
	}
});
