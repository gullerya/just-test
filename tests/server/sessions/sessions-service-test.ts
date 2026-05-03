import { test } from '@gullerya/just-test';
import { assert } from '@gullerya/just-test/assert';
import {
	getAll,
	getSession,
	storeResult
} from '../../../src/server/sessions/sessions-service.ts';

//	Only the pure / registry-only slices are covered here. `addSession` and
//	the happy path of `storeResult` drive `environments-service.launch`,
//	which depends on playwright / node subprocesses. Those paths are
//	exercised end-to-end by the matrix configs (local-runner, orchestrator).

//	-----------------------------------------------------------------
//	getSession
//	-----------------------------------------------------------------

test('getSession - rejects empty id', async () => {
	try {
		await getSession('');
		assert.fail('expected throw on empty id');
	} catch (e: any) {
		assert.isTrue(e.message.includes('invalid session ID'));
	}
});

test('getSession - rejects non-string id', async () => {
	try {
		await getSession(123 as any);
		assert.fail('expected throw on numeric id');
	} catch (e: any) {
		assert.isTrue(e.message.includes('invalid session ID'));
	}
});

test('getSession - unknown id returns null (not undefined)', async () => {
	const s = await getSession('does-not-exist');
	assert.strictEqual(s, null);
});

//	-----------------------------------------------------------------
//	getAll
//	-----------------------------------------------------------------

test('getAll - returns an object (possibly empty in unit context)', async () => {
	const all = await getAll();
	assert.isTrue(typeof all === 'object' && all !== null);
});

//	-----------------------------------------------------------------
//	storeResult
//	-----------------------------------------------------------------

test('storeResult - unknown session id throws', async () => {
	try {
		await storeResult('no-such-session', 'env-id', {});
		assert.fail('expected storeResult to throw');
	} catch (e: any) {
		assert.isTrue(e.message.includes("session ID 'no-such-session' not exists"));
	}
});

//	-----------------------------------------------------------------
//	getSession / storeResult happy paths — driven via seeded state
//
//	`sessions-service` holds sessions in a module-level record. Seeding
//	via the live reference returned by `getAll()` lets these tests
//	exercise the happy paths without touching `addSession` (which
//	transitively spawns real environments via `launch()` and is covered
//	only by the matrix's e2e runs).
//	-----------------------------------------------------------------

type MutableSessions = Record<string, any>;

async function seedSession(id: string, patch: Partial<any> = {}): Promise<() => Promise<void>> {
	const all = await getAll() as unknown as MutableSessions;
	all[id] = {
		id,
		config: patch.config ?? { environments: {} },
		result: patch.result ?? null,
		resultReady: patch.resultReady ?? false
	};
	return async () => {
		const live = await getAll() as unknown as MutableSessions;
		delete live[id];
	};
}

test('getSession - existing id returns the seeded session entry', async () => {
	const cleanup = await seedSession('lookup-me');
	try {
		const s = await getSession('lookup-me');
		assert.isTrue(s !== null);
		assert.strictEqual(s.id, 'lookup-me');
		assert.strictEqual(s.resultReady, false);
	} finally {
		await cleanup();
	}
});

test('storeResult - attaches the reported result and flips resultReady to true', async () => {
	const cleanup = await seedSession('finishing');
	try {
		//	envId is an id that does NOT exist in environments-service's
		//	internal record — `dismiss` then hits its warn/no-op branch
		//	and returns cleanly. This lets us drive the full storeResult
		//	body without standing up a real environment. The dismiss/
		//	resultReady ordering guarantee still can't be observed here
		//	(no await point between them when dismiss is a no-op) — see
		//	the test-file header for why that invariant is deferred.
		const envResult = { summary: { success: true } };
		await storeResult('finishing', 'no-such-env', envResult);

		const s = await getSession('finishing');
		assert.strictEqual(s.result, envResult);
		assert.strictEqual(s.resultReady, true);
	} finally {
		await cleanup();
	}
});

test('storeResult - overwrites a previously-attached result (last reporter wins)', async () => {
	const cleanup = await seedSession('overwriter', {
		result: { summary: { success: false } },
		resultReady: false
	});
	try {
		const fresh = { summary: { success: true } };
		await storeResult('overwriter', 'no-such-env', fresh);

		const s = await getSession('overwriter');
		assert.strictEqual(s.result, fresh);
		assert.strictEqual(s.resultReady, true);
	} finally {
		await cleanup();
	}
});
