import { test } from '@gullerya/just-test';
import { assert } from '@gullerya/just-test/assert';
import { STATUS } from '../../../src/common/constants.ts';
import { TestRun } from '../../../src/testing/model/test-run.ts';
import { TestError } from '../../../src/testing/model/test-error.ts';

//	-----------------------------------------------------------------
//	Construction
//	-----------------------------------------------------------------

test('TestRun - defaults', () => {
	const run = new TestRun();
	assert.strictEqual(run.timestamp, 0);
	assert.strictEqual(run.time, 0);
	assert.strictEqual(run.status, STATUS.INIT);
	assert.strictEqual(run.error, null);
	//	coverage is declared with no initializer; undefined until set
	assert.strictEqual(run.coverage, undefined);
});

test('TestRun - instance is sealed (no new fields)', () => {
	const run = new TestRun();
	assert.throws(() => { (run as any).bogus = 1; });
});

test('TestRun - existing fields remain mutable', () => {
	const run = new TestRun();
	run.status = STATUS.PASS;
	run.time = 42;
	run.timestamp = 123;
	run.coverage = [{ url: 'a' }];
	assert.strictEqual(run.status, STATUS.PASS);
	assert.strictEqual(run.time, 42);
	assert.strictEqual(run.timestamp, 123);
	assert.deepStrictEqual(run.coverage, [{ url: 'a' }]);
});

//	-----------------------------------------------------------------
//	error setter / getter
//	-----------------------------------------------------------------

test('TestRun#error = native Error -> getter returns a wrapped TestError', () => {
	const run = new TestRun();
	run.error = new TypeError('boom');

	const got = run.error;
	assert.isTrue(got instanceof TestError);
	assert.strictEqual(got.name, 'TypeError');
	assert.strictEqual(got.type, 'TypeError');
	assert.strictEqual(got.message, 'boom');
});

test('TestRun#error = TestError -> getter returns same instance (fromError idempotence)', () => {
	const run = new TestRun();
	const te = TestError.fromError(new Error('same'));
	run.error = te;
	assert.strictEqual(run.error, te);
});

test('TestRun#error = null -> getter returns null, clears prior value', () => {
	const run = new TestRun();
	run.error = new Error('first');
	assert.isTrue(run.error instanceof TestError);
	run.error = null as any;
	assert.strictEqual(run.error, null);
});

test('TestRun#error = undefined -> cleared (ternary is falsy-check)', () => {
	const run = new TestRun();
	run.error = new Error('first');
	run.error = undefined as any;
	assert.strictEqual(run.error, null);
});

//	-----------------------------------------------------------------
//	toJSON
//	-----------------------------------------------------------------

test('TestRun#toJSON - default shape with null error', () => {
	const run = new TestRun();
	const json = run.toJSON() as any;
	assert.strictEqual(json.timestamp, 0);
	assert.strictEqual(json.time, 0);
	assert.strictEqual(json.status, STATUS.INIT);
	assert.strictEqual(json.error, null);
	//	coverage is undefined, so it serializes as undefined (absent from JSON.stringify)
	assert.strictEqual(json.coverage, undefined);
});

test('TestRun#toJSON - with error emits TestError.toJSON shape', () => {
	const run = new TestRun();
	run.status = STATUS.FAIL;
	run.time = 11;
	run.timestamp = 222;
	run.error = new TypeError('X');

	const json = run.toJSON() as any;
	assert.strictEqual(json.status, STATUS.FAIL);
	assert.strictEqual(json.time, 11);
	assert.strictEqual(json.timestamp, 222);
	assert.strictEqual(json.error.name, 'TypeError');
	assert.strictEqual(json.error.type, 'TypeError');
	assert.strictEqual(json.error.message, 'X');
	assert.strictEqual(json.error.cause, null);
	assert.isTrue(typeof json.error.stack === 'string' && json.error.stack.length > 0);
});

test('TestRun - JSON.stringify routes through toJSON', () => {
	const run = new TestRun();
	run.status = STATUS.PASS;
	run.time = 5;
	const parsed = JSON.parse(JSON.stringify(run));
	assert.strictEqual(parsed.status, STATUS.PASS);
	assert.strictEqual(parsed.time, 5);
	assert.strictEqual(parsed.error, null);
});
