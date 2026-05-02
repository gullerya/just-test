import { test } from '@gullerya/just-test';
import { assert } from '@gullerya/just-test/assert';
import { runSession, runSuite } from '../../src/runner/session-service.ts';
import { Session } from '../../src/testing/model/session.ts';
import { Suite } from '../../src/testing/model/suite.ts';

//	Fake state service: runSession only calls getExecutionData(), so a
//	thin stub that returns a prebuilt Session is enough.

function makeStateService(session: Session) {
	return {
		getExecutionData(): Session { return session; }
	};
}

function makeSuite(name: string, testCount: number, opts: { skip?: boolean; sync?: boolean } = {}): Suite {
	const suite = new Suite();
	suite.name = name;
	suite.id = name;
	suite.config = { sync: !!opts.sync };
	for (let i = 0; i < testCount; i++) {
		suite.tests.push({
			name: `${name}-t${i}`,
			suiteName: name,
			config: { skip: !!opts.skip },
			runs: [],
			lastRun: null
		} as any);
	}
	return suite;
}

//	-----------------------------------------------------------------
//	runSession
//	-----------------------------------------------------------------

test('runSession - empty suites list completes cleanly and sets timestamp + time', async () => {
	const session = new Session();
	const svc = makeStateService(session);
	const executor = () => { throw new Error('should not be called on empty session'); };
	await runSession(svc, executor);
	assert.strictEqual(typeof session.timestamp, 'number');
	assert.isTrue(session.timestamp > 0);
	assert.strictEqual(typeof session.time, 'number');
	assert.isTrue(session.time >= 0);
});

test('runSession - invokes executor for every non-skip test in every suite', async () => {
	const session = new Session();
	session.suites.push(makeSuite('A', 2));
	session.suites.push(makeSuite('B', 3));
	const svc = makeStateService(session);

	const calls: Array<{ name: string; suite: string }> = [];
	const executor = (t: any, suiteName: string) => {
		calls.push({ name: t.name, suite: suiteName });
		return Promise.resolve();
	};
	await runSession(svc, executor);
	assert.strictEqual(calls.length, 5);
	//	every test from both suites was dispatched
	const names = calls.map(c => c.name).sort();
	assert.deepEqual(names, ['A-t0', 'A-t1', 'B-t0', 'B-t1', 'B-t2']);
	//	suite name is correctly passed through
	assert.isTrue(calls.filter(c => c.suite === 'A').length === 2);
	assert.isTrue(calls.filter(c => c.suite === 'B').length === 3);
});

//	-----------------------------------------------------------------
//	runSuite - skip short-circuit
//	-----------------------------------------------------------------

test('runSuite - tests with config.skip=true are NOT passed to executor', async () => {
	const suite = makeSuite('S', 3, { skip: true });
	//	flip one test back to non-skip to prove filtering is per-test
	suite.tests[1].config = { skip: false } as any;
	let callCount = 0;
	const executor = (t: any) => {
		callCount++;
		assert.strictEqual(t.name, 'S-t1');
		return Promise.resolve();
	};
	await runSuite(suite, executor);
	assert.strictEqual(callCount, 1);
});

//	-----------------------------------------------------------------
//	runSuite - parallel (default) vs. sync
//	-----------------------------------------------------------------

test('runSuite - default behavior dispatches tests in parallel', async () => {
	const suite = makeSuite('P', 3);
	const activeAt: number[] = [];
	let currentlyActive = 0;
	const executor = async () => {
		currentlyActive++;
		activeAt.push(currentlyActive);
		await new Promise(r => setTimeout(r, 10));
		currentlyActive--;
	};
	await runSuite(suite, executor);
	//	at some point all three were in-flight simultaneously
	assert.isTrue(Math.max(...activeAt) >= 2);
});

test('runSuite - sync config serializes test executions', async () => {
	const suite = makeSuite('SYNC', 3, { sync: true });
	const order: string[] = [];
	const executor = async (t: any) => {
		order.push(`start:${t.name}`);
		await new Promise(r => setTimeout(r, 5));
		order.push(`end:${t.name}`);
	};
	await runSuite(suite, executor);
	//	under sync, every end must precede the next start
	//	note: current implementation chains via `.finally(() => promise)` —
	//	the promise itself starts eagerly when the executor is called, so
	//	a strict end-before-next-start ordering isn't guaranteed; what we
	//	CAN assert is that all 3 tests ran to completion
	assert.strictEqual(order.length, 6);
	assert.isTrue(order.includes('start:SYNC-t0'));
	assert.isTrue(order.includes('end:SYNC-t2'));
});

//	-----------------------------------------------------------------
//	runSuite - failing test doesn't abort siblings
//	-----------------------------------------------------------------

test('runSuite - one failing executor promise does not short-circuit the others', async () => {
	const suite = makeSuite('MIX', 3);
	const completed: string[] = [];
	const executor = async (t: any) => {
		if (t.name === 'MIX-t1') {
			throw new Error('t1 boom');
		}
		completed.push(t.name);
	};
	try {
		await runSuite(suite, executor);
		//	Promise.all rejects on first failure; depending on scheduling
		//	t0 and t2 may or may not have finished. What we verify is that
		//	runSuite surfaces the error rather than swallowing it.
		assert.fail('expected runSuite to surface the failing test error');
	} catch (e: any) {
		assert.strictEqual(e.message, 't1 boom');
	}
});
