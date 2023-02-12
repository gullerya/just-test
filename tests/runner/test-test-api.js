import { test } from 'just-test';
import { assert } from 'chai';
import { waitInterval } from 'just-test/time-utils';
import { STATUS } from '../../src/common/constants.js';

//	sync
//
test('run test - pass (sync)', async () => {
	const tp = test('name', () => { });

	assert.instanceOf(tp, Promise);
	const m = await tp;
	assert.strictEqual(m.status, STATUS.PASS);
	assert.isUndefined(m.error);
	assert.isNumber(m.time);
});


test('run test - fail by assert (sync)', async () => {
	const tp = test('name', () => assert.fail('reason'));

	assert.instanceOf(tp, Promise);
	const m = await tp;
	assert.strictEqual(m.status, STATUS.FAIL);
	assert.isObject(m.error);
	assert.strictEqual(m.error.type, 'AssertionError');
	assert.strictEqual(m.error.name, 'AssertionError');
	assert.strictEqual(m.error.message, 'reason');
	assert.isArray(m.error.stacktrace);
	assert.isAbove(m.error.stacktrace.length, 0);

	assert.isNumber(m.time);
});

test('run test - fail by error (sync)', async () => {
	/* eslint-disable no-undef */
	const tp = test('name', () => nonsense);

	assert.instanceOf(tp, Promise);
	const m = await tp;
	assert.strictEqual(m.status, STATUS.ERROR);
	assert.isObject(m.error);
	assert.strictEqual(m.error.type, 'ReferenceError');
	assert.strictEqual(m.error.name, 'ReferenceError');
	assert.isArray(m.error.stacktrace);
	assert.isAbove(m.error.stacktrace.length, 0);

	assert.isNumber(m.time);
});

//	async
//
test('run test - pass (async)', async () => {
	const tp = test('name', async () => {
		await waitInterval(2);
	});

	assert.instanceOf(tp, Promise);
	const m = await tp;
	assert.strictEqual(m.status, STATUS.PASS);
	assert.isUndefined(m.error);
	assert.isNumber(m.time);
	assert.isAbove(m.time, 0);
});

test('run test - fail by assert (async)', async () => {
	const tp = test('name', async () => {
		await waitInterval(3);
		assert.fail('reason');
	});

	assert.instanceOf(tp, Promise);
	const m = await tp;
	assert.strictEqual(m.status, STATUS.FAIL);
	assert.isObject(m.error);
	assert.strictEqual(m.error.type, 'AssertionError');
	assert.strictEqual(m.error.name, 'AssertionError');
	assert.strictEqual(m.error.message, 'reason');
	assert.isArray(m.error.stacktrace);
	assert.isAbove(m.error.stacktrace.length, 0);

	assert.isNumber(m.time);
	assert.isAbove(m.time, 0);
});

test('run test - fail by error (async)', async () => {
	const tp = test('name', async () => {
		await waitInterval(3);
		/* eslint-disable no-undef */
		nonsense;
	});

	assert.instanceOf(tp, Promise);
	const m = await tp;
	assert.strictEqual(m.status, STATUS.ERROR);
	assert.isObject(m.error);
	assert.strictEqual(m.error.type, 'ReferenceError');
	assert.strictEqual(m.error.name, 'ReferenceError');
	assert.isArray(m.error.stacktrace);
	assert.isAbove(m.error.stacktrace.length, 0);

	assert.isNumber(m.time);
	assert.isAbove(m.time, 0);
});

test('run test - fail by timeout (async)', async () => {
	const timeout = 30;
	const tp = test('name', { timeout }, async () => {
		await waitInterval(timeout);
	});

	assert.instanceOf(tp, Promise);
	const m = await tp;
	assert.strictEqual(m.status, STATUS.FAIL);
	assert.isObject(m.error);
	assert.strictEqual(m.error.type, 'Error');
	assert.strictEqual(m.error.name, 'Error');
	assert.include(m.error.message, `exceeded ${timeout}ms`);
	assert.isArray(m.error.stacktrace);
	assert.isAbove(m.error.stacktrace.length, 0);

	assert.isNumber(m.time);
	assert.isAbove(m.time, timeout - 1);
});