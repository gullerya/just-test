import { STATUS } from '/aut/bin/client/common/constants.js';
import { runTest } from '/aut/bin/client/common/test-runner.js';

const suite = globalThis.getSuite('Test APIs');

//	sync
//
suite.test('run test - normal (sync)', async test => {
	const tp = runTest(() => { });

	test.assert.instanceOf(tp, Promise);
	const m = await tp;
	test.assert.strictEqual(m.status, STATUS.PASS);
	test.assert.isNull(m.error);
	test.assert.strictEqual(m.assertions, 0);
	test.assert.isNumber(m.time);
	test.assert.isAbove(m.time, 0);
});

suite.test('run test - fail by false (sync)', async test => {
	const tp = runTest(() => false);

	test.assert.instanceOf(tp, Promise);
	const m = await tp;
	test.assert.strictEqual(m.status, STATUS.FAIL);
	test.assert.isNull(m.error);
	test.assert.strictEqual(m.assertions, 0);
	test.assert.isNumber(m.time);
});

suite.test('run test - fail by assert (sync)', async test => {
	const tp = runTest(ta => ta.assert.fail('reason'));

	test.assert.instanceOf(tp, Promise);
	const m = await tp;
	test.assert.strictEqual(m.status, STATUS.FAIL);
	test.assert.isObject(m.error);
	test.assert.strictEqual(m.error.type, 'AssertionError');
	test.assert.strictEqual(m.error.name, 'AssertionError');
	test.assert.strictEqual(m.error.message, 'reason');
	test.assert.isArray(m.error.stacktrace);
	test.assert.isAbove(m.error.stacktrace.length, 0);

	test.assert.strictEqual(m.assertions, 1);
	test.assert.isNumber(m.time);
});

suite.test('run test - fail by error (sync)', async test => {
	/* eslint-disable no-undef */
	const tp = runTest(() => nonsense);

	test.assert.instanceOf(tp, Promise);
	const m = await tp;
	test.assert.strictEqual(m.status, STATUS.ERROR);
	test.assert.isObject(m.error);
	test.assert.strictEqual(m.error.type, 'ReferenceError');
	test.assert.strictEqual(m.error.name, 'ReferenceError');
	test.assert.isArray(m.error.stacktrace);
	test.assert.isAbove(m.error.stacktrace.length, 0);

	test.assert.strictEqual(m.assertions, 0);
	test.assert.isNumber(m.time);
});

//	async
//
suite.test('run test - normal (async)', async test => {
	const tp = runTest(async ta => {
		await ta.waitNextTask();
	});

	test.assert.instanceOf(tp, Promise);
	const m = await tp;
	test.assert.strictEqual(m.status, STATUS.PASS);
	test.assert.isNull(m.error);
	test.assert.strictEqual(m.assertions, 0);
	test.assert.isNumber(m.time);
	test.assert.isAbove(m.time, 0);
});

suite.test('run test - fail by false (async)', async test => {
	const tp = runTest(async ta => {
		await ta.waitNextTask();
		return false;
	});

	test.assert.instanceOf(tp, Promise);
	const m = await tp;
	test.assert.strictEqual(m.status, STATUS.FAIL);
	test.assert.isNull(m.error);
	test.assert.strictEqual(m.assertions, 0);
	test.assert.isNumber(m.time);
});

suite.test('run test - fail by assert (async)', async test => {
	const tp = runTest(async ta => {
		await ta.waitNextTask();
		ta.assert.fail('reason');
	});

	test.assert.instanceOf(tp, Promise);
	const m = await tp;
	test.assert.strictEqual(m.status, STATUS.FAIL);
	test.assert.isObject(m.error);
	test.assert.strictEqual(m.error.type, 'AssertionError');
	test.assert.strictEqual(m.error.name, 'AssertionError');
	test.assert.strictEqual(m.error.message, 'reason');
	test.assert.isArray(m.error.stacktrace);
	test.assert.isAbove(m.error.stacktrace.length, 0);

	test.assert.strictEqual(m.assertions, 1);
	test.assert.isNumber(m.time);
});

suite.test('run test - fail by error (async)', async test => {
	const tp = runTest(async ta => {
		await ta.waitNextTask();
		/* eslint-disable no-undef */
		nonsense;
	});

	test.assert.instanceOf(tp, Promise);
	const m = await tp;
	test.assert.strictEqual(m.status, STATUS.ERROR);
	test.assert.isObject(m.error);
	test.assert.strictEqual(m.error.type, 'ReferenceError');
	test.assert.strictEqual(m.error.name, 'ReferenceError');
	test.assert.isArray(m.error.stacktrace);
	test.assert.isAbove(m.error.stacktrace.length, 0);

	test.assert.strictEqual(m.assertions, 0);
	test.assert.isNumber(m.time);
});

suite.test('run test - fail by timeout (async)', async test => {
	const ttl = 30;
	const tp = runTest(async ta => {
		await ta.waitInterval(ttl);
	}, {
		ttl: ttl
	});

	test.assert.instanceOf(tp, Promise);
	const m = await tp;
	test.assert.strictEqual(m.status, STATUS.ERROR);
	test.assert.isObject(m.error);
	test.assert.strictEqual(m.error.type, 'TimeoutError');
	test.assert.strictEqual(m.error.name, 'Error');
	test.assert.strictEqual(m.error.message, `run exceeded ${ttl}ms`);
	test.assert.isArray(m.error.stacktrace);
	test.assert.isAbove(m.error.stacktrace.length, 0);

	test.assert.strictEqual(m.assertions, 0);
	test.assert.isNumber(m.time);
});