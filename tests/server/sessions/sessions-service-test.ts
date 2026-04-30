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
		assert.isTrue(e.message.includes("invalid session ID"));
	}
});

test('getSession - rejects non-string id', async () => {
	try {
		await getSession(123 as any);
		assert.fail('expected throw on numeric id');
	} catch (e: any) {
		assert.isTrue(e.message.includes("invalid session ID"));
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
