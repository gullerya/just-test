import { test } from '@gullerya/just-test';
import { assert } from '@gullerya/just-test/assert';
import { STATUS } from '../../src/common/constants.ts';
import StateService from '../../src/runner/state-service.ts';
import { Session } from '../../src/testing/model/session.ts';
import { TestRun } from '../../src/testing/model/test-run.ts';

function makeTest(name: string, suiteName: string, config: object = {}) {
	return { name, suiteName, config, runs: [], lastRun: null };
}

//	construction
//
test('StateService - defaults to fresh Session', () => {
	const svc = new StateService();
	assert.isTrue(svc.session instanceof Session);
	assert.strictEqual(svc.session.total, 0);
	assert.strictEqual(svc.session.suites.length, 0);
});

test('StateService - accepts injected Session', () => {
	const seed = new Session();
	seed.sessionId = 'abc';
	const svc = new StateService(seed);
	assert.strictEqual(svc.session, seed);
	assert.strictEqual(svc.session.sessionId, 'abc');
});

//	obtainSuite
//
test('obtainSuite - creates new suite with provided name and config', () => {
	const svc = new StateService();
	const cfg = { skip: false };
	const s = svc.obtainSuite('my-suite', cfg);
	assert.strictEqual(s.name, 'my-suite');
	assert.strictEqual(s.id, 'my-suite');
	assert.strictEqual(s.config, cfg);
	assert.strictEqual(svc.session.suites.length, 1);
});

test('obtainSuite - returns existing suite on second call', () => {
	const svc = new StateService();
	const first = svc.obtainSuite('s1');
	const second = svc.obtainSuite('s1');
	assert.strictEqual(first, second);
	assert.strictEqual(svc.session.suites.length, 1);
});

test('obtainSuite - preserves alphabetical insertion order', () => {
	const svc = new StateService();
	svc.obtainSuite('banana');
	svc.obtainSuite('apple');
	svc.obtainSuite('cherry');
	const names = svc.session.suites.map(s => s.name);
	assert.deepEqual(names, ['apple', 'banana', 'cherry']);
});

//	addTest
//
test('addTest - creates suite on demand and pushes test', () => {
	const svc = new StateService();
	const t = makeTest('t1', 's1');
	svc.addTest(t);
	const suite = svc.session.suites[0];
	assert.strictEqual(suite.tests.length, 1);
	assert.strictEqual(suite.tests[0], t);
	assert.strictEqual(suite.total, 1);
	assert.strictEqual(svc.session.total, 1);
});

test('addTest - duplicate name does NOT throw; second is pre-settled FAIL', () => {
	const svc = new StateService();
	svc.addTest(makeTest('t1', 's1'));
	svc.addTest(makeTest('t1', 's1'));
	const suite = svc.session.suites[0];
	assert.strictEqual(suite.tests.length, 2);
	const dup = suite.tests[1];
	assert.strictEqual(dup.lastRun.status, STATUS.FAIL);
	assert.strictEqual(dup.runs.length, 1);
	assert.strictEqual(dup.runs[0], dup.lastRun);
	assert.strictEqual(dup.lastRun.error.name, 'DuplicateTestError');
	assert.isTrue(dup.lastRun.error.message.includes(`'t1'`));
	assert.isTrue(dup.lastRun.error.message.includes(`'s1'`));
	assert.isTrue(dup.lastRun.error.message.toLowerCase().includes('duplicate'));
});

test('addTest - duplicate increments fail/done counters at session and suite', () => {
	const svc = new StateService();
	svc.addTest(makeTest('t1', 's1'));
	svc.addTest(makeTest('t1', 's1'));
	const suite = svc.session.suites[0];
	assert.strictEqual(svc.session.total, 2);
	assert.strictEqual(svc.session.fail, 1);
	assert.strictEqual(svc.session.done, 1);
	assert.strictEqual(suite.total, 2);
	assert.strictEqual(suite.fail, 1);
	assert.strictEqual(suite.done, 1);
});

test('addTest - first test is unaffected by a later duplicate', () => {
	const svc = new StateService();
	svc.addTest(makeTest('t1', 's1'));
	svc.addTest(makeTest('t1', 's1'));
	const first = svc.session.suites[0].tests[0];
	assert.strictEqual(first.lastRun, null);
	assert.strictEqual(first.runs.length, 0);
});

test('addTest - duplicate with only:true does NOT flip suite.onlyMode', () => {
	const svc = new StateService();
	svc.addTest(makeTest('t1', 's1'));
	svc.addTest(makeTest('t1', 's1', { only: true }));
	assert.isFalse(!!svc.session.suites[0].onlyMode);
});

test('addTest - tests following a duplicate still register normally (no cascade)', () => {
	const svc = new StateService();
	svc.addTest(makeTest('t1', 's1'));
	svc.addTest(makeTest('t1', 's1'));
	svc.addTest(makeTest('t2', 's1'));
	const suite = svc.session.suites[0];
	assert.strictEqual(suite.tests.length, 3);
	assert.strictEqual(suite.tests[2].name, 't2');
	assert.strictEqual(suite.tests[2].lastRun, null);
});

test('addTest - same name in a different suite is allowed', () => {
	const svc = new StateService();
	svc.addTest(makeTest('t1', 's1'));
	svc.addTest(makeTest('t1', 's2'));
	assert.strictEqual(svc.session.total, 2);
	assert.strictEqual(svc.session.fail, 0);
});

test('addTest - only:true flips suite.onlyMode', () => {
	const svc = new StateService();
	svc.addTest(makeTest('t1', 's1', { only: true }));
	assert.isTrue(svc.session.suites[0].onlyMode);
});

test('addTest - skip:true pre-populates a SKIP lastRun and increments counters', () => {
	const svc = new StateService();
	svc.addTest(makeTest('t1', 's1', { skip: true }));
	const suite = svc.session.suites[0];
	const t = suite.tests[0];
	assert.strictEqual(t.lastRun.status, STATUS.SKIP);
	assert.strictEqual(t.runs.length, 1);
	assert.strictEqual(svc.session.skip, 1);
	assert.strictEqual(svc.session.done, 1);
	assert.strictEqual(suite.skip, 1);
	assert.strictEqual(suite.done, 1);
});

//	updateRunStarted / updateRunEnded
//
test('updateRunStarted - seeds timestamps and records RUNS', () => {
	const svc = new StateService();
	svc.addTest(makeTest('t1', 's1'));
	svc.updateRunStarted('s1', 't1');
	const suite = svc.session.suites[0];
	const t = suite.tests[0];
	assert.strictEqual(t.lastRun.status, STATUS.RUNS);
	assert.strictEqual(t.runs.length, 1);
	assert.isTrue(svc.session.timestamp > 0);
	assert.isTrue(suite.timestamp > 0);
});

test('updateRunEnded - PASS updates counters and commits time when final', () => {
	const svc = new StateService();
	svc.addTest(makeTest('t1', 's1'));
	svc.updateRunStarted('s1', 't1');

	const run = new TestRun();
	run.status = STATUS.PASS;
	svc.updateRunEnded('s1', 't1', run);

	const suite = svc.session.suites[0];
	assert.strictEqual(svc.session.pass, 1);
	assert.strictEqual(svc.session.done, 1);
	assert.strictEqual(suite.pass, 1);
	assert.strictEqual(suite.done, 1);
	//	all tests done → session/suite time committed
	assert.isTrue(typeof svc.session.time === 'number' && svc.session.time >= 0);
	assert.isTrue(typeof suite.time === 'number' && suite.time >= 0);
});

test('updateRunEnded - FAIL and ERROR counters aggregate independently', () => {
	const svc = new StateService();
	svc.addTest(makeTest('t1', 's1'));
	svc.addTest(makeTest('t2', 's1'));

	svc.updateRunStarted('s1', 't1');
	const failRun = new TestRun();
	failRun.status = STATUS.FAIL;
	svc.updateRunEnded('s1', 't1', failRun);

	svc.updateRunStarted('s1', 't2');
	const errRun = new TestRun();
	errRun.status = STATUS.ERROR;
	svc.updateRunEnded('s1', 't2', errRun);

	assert.strictEqual(svc.session.fail, 1);
	assert.strictEqual(svc.session.error, 1);
	assert.strictEqual(svc.session.done, 2);
});

test('updateRunEnded - re-run rolls back previous result', () => {
	const svc = new StateService();
	svc.addTest(makeTest('t1', 's1'));

	svc.updateRunStarted('s1', 't1');
	const fail = new TestRun();
	fail.status = STATUS.FAIL;
	svc.updateRunEnded('s1', 't1', fail);
	assert.strictEqual(svc.session.fail, 1);
	assert.strictEqual(svc.session.done, 1);

	//	second run start rolls back the previous one
	svc.updateRunStarted('s1', 't1');
	assert.strictEqual(svc.session.fail, 0);
	assert.strictEqual(svc.session.done, 0);

	const pass = new TestRun();
	pass.status = STATUS.PASS;
	svc.updateRunEnded('s1', 't1', pass);
	assert.strictEqual(svc.session.pass, 1);
	assert.strictEqual(svc.session.done, 1);
});

test('updateRunEnded - without prior updateRunStarted seeds runs with the provided run', () => {
	const svc = new StateService();
	svc.addTest(makeTest('t1', 's1'));

	const run = new TestRun();
	run.status = STATUS.PASS;
	svc.updateRunEnded('s1', 't1', run);

	const t = svc.session.suites[0].tests[0];
	assert.strictEqual(t.lastRun, run);
	assert.strictEqual(t.runs.length, 1);
	assert.strictEqual(t.runs[0], run);
	assert.strictEqual(svc.session.pass, 1);
});

test('updateRunStarted - session.timestamp is seeded once and not overwritten on subsequent calls', () => {
	const svc = new StateService();
	svc.addTest(makeTest('t1', 's1'));
	svc.addTest(makeTest('t2', 's1'));

	svc.updateRunStarted('s1', 't1');
	const firstTs = svc.session.timestamp;
	assert.isTrue(firstTs > 0);

	//	even a later run-start must NOT re-seed the session timestamp
	svc.updateRunStarted('s1', 't2');
	assert.strictEqual(svc.session.timestamp, firstTs);
});

//	getTest
//
test('getTest - returns the registered test by suite/name', () => {
	const svc = new StateService();
	const t = makeTest('t1', 's1');
	svc.addTest(t);
	assert.strictEqual(svc.getTest('s1', 't1'), t);
});

test('getTest - returns undefined when test not registered in the suite', () => {
	const svc = new StateService();
	svc.addTest(makeTest('t1', 's1'));
	assert.isTrue(svc.getTest('s1', 'nope') === undefined);
});

//	reportError
//
test('reportError - appends to session.errors and bumps error counter', () => {
	const svc = new StateService();
	const err = Object.assign(new Error('x'), { type: 'RuntimeError' });
	svc.reportError(err as Error & { type: string });
	assert.strictEqual(svc.session.errors.length, 1);
	assert.strictEqual(svc.session.errors[0], err);
	assert.strictEqual(svc.session.error, 1);
});

//	getExecutionData
//
test('getExecutionData - returns the live session reference', () => {
	const svc = new StateService();
	assert.strictEqual(svc.getExecutionData(), svc.session);
});
