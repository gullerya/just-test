import { test } from '@gullerya/just-test';
import { assert } from '@gullerya/just-test/assert';
import { test as testSUT } from '../../src/runner/just-test.ts';
import { waitInterval } from '../../src/common/time-utils.ts';
import { STATUS } from '../../src/common/constants.ts';
import { EXECUTION_MODES, PlanningExecutionContext, setExecutionContext } from '../../src/runner/environment-config.ts';

const isolatedECKey = 'test-runner-test-api-ec';
const isoTestConf = { ecKey: isolatedECKey };

//	PLAN mode
//
test('PLAN mode - registers testConfig with defaults', () => {
	const planECKey = 'test-runner-test-api-plan-ec';
	const ec = setExecutionContext(EXECUTION_MODES.PLAN, null, null, null, planECKey as any) as PlanningExecutionContext;
	testSUT('name', () => { }, { ecKey: planECKey });

	assert.isTrue(ec instanceof Object && Array.isArray(ec.testConfigs));
	assert.deepEqual(ec.testConfigs[0], {
		name: 'name',
		config: { only: false, skip: false, timeout: 3000, ecKey: planECKey }
	});
});

//	sync
//
test('run test - pass (sync)', async () => {
	const tp = testSUT('name', () => { }, isoTestConf);

	assert.isTrue(tp instanceof Promise);
	const m: any = await tp;
	assert.strictEqual(m.status, STATUS.PASS);
	assert.isTrue(m.error === null);
	assert.isTrue(typeof m.time === 'number');
});

test('run test - fail by assert (sync)', async () => {
	const tp = testSUT('name', () => assert.fail('reason'), isoTestConf);

	assert.isTrue(tp instanceof Promise);
	const m: any = await tp;
	assert.strictEqual(m.status, STATUS.FAIL);
	assert.strictEqual(m.error.type, 'AssertionError');
	assert.strictEqual(m.error.name, 'Error');
	assert.strictEqual(m.error.message, `failed on assertion 'fail':\n\t\texpected: 'undefined'\n\t\treceived: 'undefined'\n\t\tmessage: reason`);
	assert.isTrue(m.error.stack.length > 0);
	assert.isTrue(typeof m.time === 'number');
});

test('run test - fail by error (sync)', async () => {
	//	`eval` preserves the original intent — reference a truly
	//	undeclared identifier to get a genuine ReferenceError at runtime
	const tp = testSUT('name', () => { eval('nonsense_sync'); }, isoTestConf);

	assert.isTrue(tp instanceof Promise);
	const m: any = await tp;
	assert.strictEqual(m.status, STATUS.ERROR);
	assert.strictEqual(m.error.type, 'ReferenceError');
	assert.strictEqual(m.error.name, 'ReferenceError');
	assert.isTrue(m.error.message.includes('nonsense_sync'));
	assert.isTrue(m.error.stack.length > 0);
	assert.isTrue(typeof m.time === 'number');
});

test('run test - skip', async () => {
	const tp = testSUT('name', () => { }, { ...isoTestConf, skip: true });

	assert.isTrue(tp instanceof Promise);
	const m: any = await tp;
	assert.strictEqual(m.status, STATUS.SKIP);
	assert.isTrue(m.error === null);
	assert.isTrue(m.time === 0);
});

test('setup test - error on bad name', async () => {
	const tr: any = await testSUT('', () => { }, isoTestConf);
	assert.strictEqual(tr.error.message, `test name MUST be a non-empty string, got: ''`);
});

test('setup test - error on only+skip combo', async () => {
	const tr: any = await testSUT('name', () => { }, { ...isoTestConf, skip: true, only: true });
	assert.strictEqual(
		tr.error.message,
		`can't opt in 'only' and 'skip' at the same time, found in test: name`
	);
});

//	async
//
test('run test - pass (async)', async () => {
	const tp = testSUT('name', async () => {
		await waitInterval(2);
	}, isoTestConf);

	assert.isTrue(tp instanceof Promise);
	const m: any = await tp;
	assert.strictEqual(m.status, STATUS.PASS);
	assert.isTrue(m.error === null);
	assert.isTrue(typeof m.time === 'number');
	assert.isTrue(m.time > 0);
});

test('run test - fail by assert (async)', async () => {
	const tp = testSUT('name', async () => {
		await waitInterval(3);
		assert.fail('reason');
	}, isoTestConf);

	assert.isTrue(tp instanceof Promise);
	const m: any = await tp;
	assert.strictEqual(m.status, STATUS.FAIL);
	assert.isTrue(typeof m.error === 'object');
	assert.strictEqual(m.error.type, 'AssertionError');
	assert.strictEqual(m.error.name, 'Error');
	assert.isTrue(m.error.stack.length > 0);
	assert.isTrue(typeof m.time === 'number');
	assert.isTrue(m.time > 0);
});

test('run test - fail by error (async)', async () => {
	const tp = testSUT('name', async () => {
		await waitInterval(3);
		eval('nonsense_async');
	}, isoTestConf);

	assert.isTrue(tp instanceof Promise);
	const m: any = await tp;
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
	const tp = testSUT('name', async () => {
		await waitInterval(timeout);
	}, { ...isoTestConf, timeout });

	assert.isTrue(tp instanceof Promise);
	const m: any = await tp;
	assert.strictEqual(m.status, STATUS.FAIL);
	assert.isTrue(typeof m.error === 'object');
	assert.strictEqual(m.error.type, 'Error');
	assert.strictEqual(m.error.name, 'Error');
	assert.isTrue(m.error.message.includes(`exceeded ${timeout}ms`));
	assert.isTrue(m.error.stack.length > 0);
	assert.isTrue(typeof m.time === 'number');
	assert.isTrue(m.time > timeout - 1);
});

//	validate - input shape
//
test('setup test - error on missing code', async () => {
	const tr: any = await testSUT('name', null as any, isoTestConf);
	assert.isTrue(tr.error.message.startsWith('test code expected, got:'));
});

test('setup test - error on non-function code', async () => {
	const tr: any = await testSUT('name', 'not a function' as any, isoTestConf);
	assert.isTrue(tr.error.message.startsWith('test code expected, got:'));
});

test('setup test - error on non-object opts', async () => {
	const tr: any = await testSUT('name', () => { }, 'bogus' as any);
	assert.isTrue(tr.error.message.startsWith('options, when provided, expected to be a non-null object'));
});

//	TEST mode - testId mismatch short-circuits
//
test('TEST mode - testId mismatch returns null without running code', async () => {
	const isolatedKey = 'test-runner-test-api-mismatch-ec';
	let started = false;
	let ended = false;
	let executed = false;
	setExecutionContext(
		EXECUTION_MODES.TEST,
		'the-real-test',
		async () => { started = true; },
		async () => { ended = true; },
		isolatedKey as any
	);

	const result = await testSUT('some-other-test', () => { executed = true; }, { ecKey: isolatedKey });
	assert.strictEqual(result, null);
	assert.isFalse(started);
	assert.isFalse(ended);
	assert.isFalse(executed);
});

//	TEST mode - testId match invokes start and end handlers
//
test('TEST mode - testId match invokes start/end handlers in order', async () => {
	const isolatedKey = 'test-runner-test-api-match-ec';
	const order: string[] = [];
	let seenRun: any = null;
	setExecutionContext(
		EXECUTION_MODES.TEST,
		'my-test',
		async (name: string) => { order.push(`start:${name}`); },
		async (name: string, run: any) => { order.push(`end:${name}`); seenRun = run; },
		isolatedKey as any
	);

	await testSUT('my-test', () => { order.push('code'); }, { ecKey: isolatedKey });
	assert.deepEqual(order, ['start:my-test', 'code', 'end:my-test']);
	assert.strictEqual(seenRun.status, STATUS.PASS);
});

//	finalizeRun - error with name-containing-assert is classified as FAIL
//
test('finalizeRun - error.name containing "assert" classifies as FAIL', async () => {
	class CustomAssertionError extends Error {
		constructor(message: string) {
			super(message);
			this.name = 'MyAssertionError';
		}
	}
	const tp = testSUT('name', () => { throw new CustomAssertionError('boom'); }, isoTestConf);
	const m: any = await tp;
	assert.strictEqual(m.status, STATUS.FAIL);
	assert.isTrue(m.error.name.toLowerCase().includes('assert'));
});

//	run.time - minimum floor of 0.1ms
//
test('run.time - instant sync success still reports time >= 0.1ms', async () => {
	const tp = testSUT('name', () => { }, isoTestConf);
	const m: any = await tp;
	assert.strictEqual(m.status, STATUS.PASS);
	assert.isTrue(m.time >= 0.1);
});

//	finalizeRun - non-Error-shaped runError (no name/message) falls through to PASS
//
//	covers the else-branch in finalizeRun when the thrown value lacks
//	the standard Error shape — logger.error still runs, but the run is
//	classified as PASS because nothing identifiable failed
test('finalizeRun - thrown non-Error (e.g. thrown string) classifies as PASS', async () => {
	const tp = testSUT('name', () => {
		//	eslint-disable-next-line no-throw-literal
		throw 'plain-string-thrown';
	}, isoTestConf);
	const m: any = await tp;
	assert.strictEqual(m.status, STATUS.PASS);
	assert.isTrue(m.error === null);
});

test('finalizeRun - thrown non-Error object without name/message classifies as PASS', async () => {
	const tp = testSUT('name', () => {
		// eslint-disable-next-line @typescript-eslint/only-throw-error
		throw { foo: 'bar' };
	}, isoTestConf);
	const m: any = await tp;
	assert.strictEqual(m.status, STATUS.PASS);
	assert.isTrue(m.error === null);
});
