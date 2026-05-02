import { test } from '@gullerya/just-test';
import { assert } from '@gullerya/just-test/assert';
import { TestError } from '../../../src/testing/model/test-error.ts';

//	-----------------------------------------------------------------
//	fromError — input validation
//	-----------------------------------------------------------------

test('TestError.fromError - non-Error input throws TypeError', () => {
	assert.throws(() => TestError.fromError(null), 'the provided value (null) is not an Error instance');
	assert.throws(() => TestError.fromError(123 as any), 'the provided value (123) is not an Error instance');
	assert.throws(() => TestError.fromError('test' as any), 'the provided value (test) is not an Error instance');
	assert.throws(() => TestError.fromError({} as any), 'the provided value ([object Object]) is not an Error instance');
	assert.throws(() => TestError.fromError(undefined), 'the provided value (undefined) is not an Error instance');
});

//	-----------------------------------------------------------------
//	fromError — happy path
//	-----------------------------------------------------------------

test('TestError.fromError - wraps a native Error preserving name/type/message/stack', () => {
	const error = new TypeError('This is a type error');
	const r = TestError.fromError(error);

	assert.strictEqual(r.name, 'TypeError');
	assert.strictEqual(r.type, 'TypeError');
	assert.strictEqual(r.message, 'This is a type error');
	assert.strictEqual(r.cause, null);
	assert.isTrue(r.stack.length > 0);
});

test('TestError.fromError - recursively wraps nested Error causes', () => {
	const error = new TypeError('outer', { cause: new ReferenceError('inner') });
	const r = TestError.fromError(error);

	assert.strictEqual(r.name, 'TypeError');
	assert.strictEqual(r.type, 'TypeError');
	assert.strictEqual(r.message, 'outer');
	assert.isTrue(r.stack.length > 0);

	assert.strictEqual(r.cause.name, 'ReferenceError');
	assert.strictEqual(r.cause.type, 'ReferenceError');
	assert.strictEqual(r.cause.message, 'inner');
	assert.strictEqual(r.cause.cause, null);
	assert.isTrue(r.cause.stack.length > 0);
});

test('TestError.fromError - deeply nested cause chain survives three levels', () => {
	const lvl3 = new RangeError('lvl3');
	const lvl2 = new ReferenceError('lvl2', { cause: lvl3 });
	const lvl1 = new TypeError('lvl1', { cause: lvl2 });
	const r = TestError.fromError(lvl1);

	assert.strictEqual(r.type, 'TypeError');
	assert.strictEqual(r.cause.type, 'ReferenceError');
	assert.strictEqual(r.cause.cause.type, 'RangeError');
	assert.strictEqual(r.cause.cause.cause, null);
});

test('TestError.fromError - non-Error cause is ignored (cause = null)', () => {
	const e = new Error('top');
	(e as any).cause = 'a string cause';
	const r = TestError.fromError(e);
	assert.strictEqual(r.cause, null);
});

test('TestError.fromError - Error without cause property yields cause = null', () => {
	const e = new Error('no cause');
	const r = TestError.fromError(e);
	assert.strictEqual(r.cause, null);
});

//	-----------------------------------------------------------------
//	fromError — idempotence
//	-----------------------------------------------------------------

test('TestError.fromError - passing a TestError returns the same instance', () => {
	const original = TestError.fromError(new Error('once'));
	const again = TestError.fromError(original as any);
	assert.strictEqual(again, original);
});

//	-----------------------------------------------------------------
//	toJSON — static
//	-----------------------------------------------------------------

test('TestError.toJSON(null) returns null', () => {
	assert.strictEqual(TestError.toJSON(null as any), null);
});

test('TestError.toJSON(testError) emits full shape', () => {
	const te = TestError.fromError(new TypeError('boom'));
	const json = TestError.toJSON(te as any) as any;

	assert.strictEqual(json.name, 'TypeError');
	assert.strictEqual(json.type, 'TypeError');
	assert.strictEqual(json.message, 'boom');
	assert.isTrue(typeof json.stack === 'string' && json.stack.length > 0);
	assert.strictEqual(json.cause, null);
});

test('TestError.toJSON(nativeError) works dual-use (intentional)', () => {
	const err = new RangeError('range-boom');
	const json = TestError.toJSON(err) as any;

	assert.strictEqual(json.name, 'RangeError');
	assert.strictEqual(json.type, 'RangeError');
	assert.strictEqual(json.message, 'range-boom');
	assert.strictEqual(json.cause, null);
});

test('TestError.toJSON emits a nested cause recursively', () => {
	const te = TestError.fromError(new TypeError('outer', { cause: new Error('inner') }));
	const json = TestError.toJSON(te as any) as any;

	assert.strictEqual(json.cause.name, 'Error');
	assert.strictEqual(json.cause.type, 'Error');
	assert.strictEqual(json.cause.message, 'inner');
	assert.strictEqual(json.cause.cause, null);
});

//	-----------------------------------------------------------------
//	toJSON — instance delegates to static
//	-----------------------------------------------------------------

test('TestError#toJSON() delegates to the static and matches its output', () => {
	const te = TestError.fromError(new TypeError('same'));
	const instanceJson = te.toJSON();
	const staticJson = TestError.toJSON(te as any);
	assert.deepStrictEqual(instanceJson, staticJson);
});

test('JSON.stringify(testError) routes through toJSON', () => {
	const te = TestError.fromError(new TypeError('stringify me'));
	const round = JSON.parse(JSON.stringify(te));
	assert.strictEqual(round.name, 'TypeError');
	assert.strictEqual(round.type, 'TypeError');
	assert.strictEqual(round.message, 'stringify me');
});

//	-----------------------------------------------------------------
//	getStacklines
//	-----------------------------------------------------------------

test('TestError#getStacklines - empty stack returns empty array', () => {
	const te = new TestError('n', 't', 'm', '', null);
	assert.deepStrictEqual(te.getStacklines(), []);
});

test('TestError#getStacklines - splits on \\n, trims, drops empty lines', () => {
	const te = new TestError('n', 't', 'm', '  line-one  \n\n  line-two\n', null);
	assert.deepStrictEqual(te.getStacklines(), ['line-one', 'line-two']);
});

test('TestError#getStacklines - splits on \\r\\n and \\r too', () => {
	const te = new TestError('n', 't', 'm', 'a\r\nb\rc\n', null);
	assert.deepStrictEqual(te.getStacklines(), ['a', 'b', 'c']);
});

//	-----------------------------------------------------------------
//	constructor — direct
//	-----------------------------------------------------------------

test('TestError constructor - all args readable via getters, cause defaults to null', () => {
	const te = new TestError('my-name', 'my-type', 'my-message', 'my-stack');
	assert.strictEqual(te.name, 'my-name');
	assert.strictEqual(te.type, 'my-type');
	assert.strictEqual(te.message, 'my-message');
	assert.strictEqual(te.stack, 'my-stack');
	assert.strictEqual(te.cause, null);
});

test('TestError constructor - explicit cause is kept as-is', () => {
	const causeTe = new TestError('c', 'c', 'c-msg', 'c-stack');
	const te = new TestError('p', 'p', 'p-msg', 'p-stack', causeTe);
	assert.strictEqual(te.cause, causeTe);
});
