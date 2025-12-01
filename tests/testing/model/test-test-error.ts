import { test } from '../../../src/runner/just-test.js';
import { assert } from '../../../src/common/assert-utils.ts';
import { TestError } from '../../../src/testing/model/test-error.ts';

test('not an error return null', () => {
	assert.throws(() => TestError.fromError(null), 'the provided value (null) is not an Error instance');
	assert.throws(() => TestError.fromError(123), 'the provided value (123) is not an Error instance');
	assert.throws(() => TestError.fromError('test'), 'the provided value (test) is not an Error instance');
	assert.throws(() => TestError.fromError({}), 'the provided value ([object Object]) is not an Error instance');
	assert.throws(() => TestError.fromError(undefined), 'the provided value (undefined) is not an Error instance');
});

test('processError with valid Error object - shallow', () => {
	const error = new TypeError('This is a type error');
	const r = TestError.fromError(error);

	assert.strictEqual(r.name, 'TypeError');
	assert.strictEqual(r.type, 'TypeError');
	assert.strictEqual(r.message, 'This is a type error');
	assert.strictEqual(r.cause, null);
	assert.isTrue(r.stack.length > 0);
});

test('processError with valid Error object - nested', () => {
	const error = new TypeError('This is a type error', { cause: new ReferenceError('This is a reference error') });
	const r = TestError.fromError(error);

	assert.strictEqual(r.name, 'TypeError');
	assert.strictEqual(r.type, 'TypeError');
	assert.strictEqual(r.message, 'This is a type error');
	assert.isTrue(r.stack.length > 0);

	assert.strictEqual(r.cause.name, 'ReferenceError');
	assert.strictEqual(r.cause.type, 'ReferenceError');
	assert.strictEqual(r.cause.message, 'This is a reference error');
	assert.strictEqual(r.cause.cause, null);
	assert.isTrue(r.cause.stack.length > 0);
});
