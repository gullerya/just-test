import { test } from '@gullerya/just-test';
import { assert } from '@gullerya/just-test/assert';
import {
	setExecutionContext,
	getExecutionContext,
	ENVIRONMENT_KEYS,
	EXECUTION_MODES,
	PlanningExecutionContext
} from '../../src/runner/environment-config.ts';

//	setExecutionContext writes into globalThis[key]. Each test uses a
//	unique Symbol key so contexts don't collide with the outer harness
//	or with sibling tests.

function uniqueKey(tag: string): symbol {
	return Symbol(`env-config-test:${tag}:${Math.random()}`);
}

//	-----------------------------------------------------------------
//	constants are frozen
//	-----------------------------------------------------------------

test('ENVIRONMENT_KEYS is frozen', () => {
	assert.isTrue(Object.isFrozen(ENVIRONMENT_KEYS));
	assert.throws(() => { (ENVIRONMENT_KEYS as any).TEST_ID = 'x'; });
});

test('EXECUTION_MODES is frozen', () => {
	assert.isTrue(Object.isFrozen(EXECUTION_MODES));
	assert.throws(() => { (EXECUTION_MODES as any).PLAN = 'x'; });
});

//	-----------------------------------------------------------------
//	setExecutionContext - PLAN
//	-----------------------------------------------------------------

test('setExecutionContext PLAN - returns PlanningExecutionContext with empty testConfigs', () => {
	const key = uniqueKey('plan-basic');
	const ec = setExecutionContext(EXECUTION_MODES.PLAN, null, null, null, key) as PlanningExecutionContext;
	assert.strictEqual(ec.mode, EXECUTION_MODES.PLAN);
	assert.isTrue(Array.isArray(ec.testConfigs));
	assert.strictEqual(ec.testConfigs.length, 0);
	//	instance is frozen (addTestConfig mutates the inner array, not the instance)
	assert.isTrue(Object.isFrozen(ec));
});

test('setExecutionContext PLAN - suiteName is settable', () => {
	const key = uniqueKey('plan-suite');
	const ec = setExecutionContext(EXECUTION_MODES.PLAN, null, null, null, key) as PlanningExecutionContext;
	assert.strictEqual(ec.suiteName, undefined);
	ec.suiteName = 'my-suite';
	assert.strictEqual(ec.suiteName, 'my-suite');
});

test('PlanningExecutionContext.addTestConfig - appends to testConfigs', () => {
	const key = uniqueKey('plan-add');
	const ec = setExecutionContext(EXECUTION_MODES.PLAN, null, null, null, key) as PlanningExecutionContext;
	ec.addTestConfig({ name: 'a', config: {} });
	ec.addTestConfig({ name: 'b', config: { skip: true } });
	assert.strictEqual(ec.testConfigs.length, 2);
	assert.strictEqual(ec.testConfigs[0].name, 'a');
	assert.strictEqual(ec.testConfigs[1].name, 'b');
	assert.isTrue(ec.testConfigs[1].config.skip);
});

//	-----------------------------------------------------------------
//	setExecutionContext - TEST
//	-----------------------------------------------------------------

test('setExecutionContext TEST - exposes testId and handlers', () => {
	const key = uniqueKey('test-basic');
	const start = async () => { };
	const end = async () => { };
	const ec: any = setExecutionContext(EXECUTION_MODES.TEST, 'test-xyz', start, end, key);
	assert.strictEqual(ec.mode, EXECUTION_MODES.TEST);
	assert.strictEqual(ec.testId, 'test-xyz');
	assert.strictEqual(ec.startHandler, start);
	assert.strictEqual(ec.endHandler, end);
	assert.isTrue(Object.isFrozen(ec));
});

//	-----------------------------------------------------------------
//	setExecutionContext - unknown mode
//	-----------------------------------------------------------------

test('setExecutionContext - rejects unknown mode', () => {
	try {
		setExecutionContext('BOGUS' as any, null, null, null, uniqueKey('bad-mode'));
		assert.fail('expected throw on unknown mode');
	} catch (e: any) {
		assert.isTrue(e.message.includes("unexpected execution mode 'BOGUS'"));
	}
});

//	-----------------------------------------------------------------
//	getExecutionContext
//	-----------------------------------------------------------------

test('getExecutionContext - returns PLAIN_RUN default when no context set for key', () => {
	const ec: any = getExecutionContext(uniqueKey('never-set'));
	assert.strictEqual(ec.mode, EXECUTION_MODES.PLAIN_RUN);
});

test('getExecutionContext - returns the context previously set with the same key', () => {
	const key = uniqueKey('round-trip');
	const written = setExecutionContext(EXECUTION_MODES.PLAN, null, null, null, key);
	const read = getExecutionContext(key);
	assert.strictEqual(read, written);
});

test('getExecutionContext - keys scope contexts independently', () => {
	const keyA = uniqueKey('scope-a');
	const keyB = uniqueKey('scope-b');
	const ecA = setExecutionContext(EXECUTION_MODES.PLAN, null, null, null, keyA);
	const ecB = setExecutionContext(EXECUTION_MODES.TEST, 'only-in-b', async () => { }, async () => { }, keyB);
	assert.strictEqual(getExecutionContext(keyA), ecA);
	assert.strictEqual(getExecutionContext(keyB), ecB);
	assert.isTrue(ecA !== ecB);
});
