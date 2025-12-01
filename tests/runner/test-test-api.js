import { test } from '../../src/runner/just-test.js';
import { assert } from '../../src/common/assert-utils.ts';
import { waitInterval } from '../../src/common/time-utils.js';
import { STATUS } from '../../src/common/constants.js';

const isolatedECKey = 'test-runner-test-api-ec';
const isoTestConf = { ecKey: isolatedECKey };

//	sync
//
test('run test - pass (sync)', async () => {
	const tp = test('name', isoTestConf, () => { });

	assert.isTrue(tp instanceof Promise);
	const m = await tp;
	assert.strictEqual(m.status, STATUS.PASS);
	assert.isTrue(m.error === undefined);
	assert.isTrue(typeof m.time === 'number');
});

test('run test - fail by assert (sync)', async () => {
	const tp = test('name', isoTestConf, () => assert.fail('reason'));

	assert.isTrue(tp instanceof Promise);
	const m = await tp;
	assert.strictEqual(m.status, STATUS.FAIL);
	assert.strictEqual(m.error.type, 'AssertionError');
	assert.strictEqual(m.error.name, 'Error');
	assert.strictEqual(m.error.message, `failed on assertion 'fail':\n\t\texpected: 'undefined'\n\t\treceived: 'undefined'\n\t\tmessage: reason`);
	assert.isTrue(m.error.stack.length > 0);
	assert.isTrue(typeof m.time === 'number');
});

test('run test - fail by error (sync)', async () => {
	/* eslint-disable-next-line no-undef */
	const tp = test('name', isoTestConf, () => nonsense);

	assert.isTrue(tp instanceof Promise);
	const m = await tp;
	assert.strictEqual(m.status, STATUS.ERROR);
	assert.strictEqual(m.error.type, 'ReferenceError');
	assert.strictEqual(m.error.name, 'ReferenceError');
	assert.isTrue(m.error.message.includes('nonsense'));
	assert.isTrue(m.error.stack.length > 0);
	assert.isTrue(typeof m.time === 'number');
});

test('run test - skip', async () => {
	const tp = test('name', { ...isoTestConf, skip: true }, () => { });

	assert.isTrue(tp instanceof Promise);
	const m = await tp;
	assert.strictEqual(m.status, STATUS.SKIP);
	assert.isTrue(m.error === undefined);
	assert.isTrue(m.time === undefined);
});

test('setup test - error on bad name', async () => {
	await assert.rejects(() => test('', isoTestConf, () => { }), 'test name MUST be a non-empty string');
});

test('setup test - error on bad options', { only: true }, async () => {
	await assert.rejects(
		() => test('name', { ...isoTestConf, skip: true, only: true }, () => { }),
		`can't opt in 'only' and 'skip' at the same time`
	);
});

//	async
//
test('run test - pass (async)', async () => {
	const tp = test('name', isoTestConf, async () => {
		await waitInterval(2);
	});

	assert.isTrue(tp instanceof Promise);
	const m = await tp;
	assert.strictEqual(m.status, STATUS.PASS);
	assert.isTrue(m.error === undefined);
	assert.isTrue(typeof m.time === 'number');
	assert.isTrue(m.time > 0);
});

test('run test - fail by assert (async)', async () => {
	const tp = test('name', isoTestConf, async () => {
		await waitInterval(3);
		assert.fail('reason');
	});

	assert.isTrue(tp instanceof Promise);
	const m = await tp;
	assert.strictEqual(m.status, STATUS.FAIL);
	assert.isTrue(typeof m.error === 'object');
	assert.strictEqual(m.error.type, 'AssertionError');
	assert.strictEqual(m.error.name, 'Error');
	assert.isTrue(m.error.stack.length > 0);
	assert.isTrue(typeof m.time === 'number');
	assert.isTrue(m.time > 0);
});

test('run test - fail by error (async)', async () => {
	const tp = test('name', isoTestConf, async () => {
		await waitInterval(3);
		/* eslint-disable-next-line no-undef */
		nonsense;
	});

	assert.isTrue(tp instanceof Promise);
	const m = await tp;
	assert.strictEqual(m.status, STATUS.ERROR);
	assert.isTrue(typeof m.error === 'object');
	assert.strictEqual(m.error.type, 'ReferenceError');
	assert.strictEqual(m.error.name, 'ReferenceError');
	assert.isTrue(m.error.stack.length > 0);
	assert.isTrue(typeof m.time === 'number');
	assert.isTrue(m.time > 0);
});

test('run test - fail by timeout (async)', async () => {
	const timeout = 30;
	const tp = test('name', { ...isoTestConf, timeout }, async () => {
		await waitInterval(timeout);
	});

	assert.isTrue(tp instanceof Promise);
	const m = await tp;
	assert.strictEqual(m.status, STATUS.FAIL);
	assert.isTrue(typeof m.error === 'object');
	assert.strictEqual(m.error.type, 'Error');
	assert.strictEqual(m.error.name, 'Error');
	assert.isTrue(m.error.message.includes(`exceeded ${timeout}ms`));
	assert.isTrue(m.error.stack.length > 0);
	assert.isTrue(typeof m.time === 'number');
	assert.isTrue(m.time > timeout - 1);
});