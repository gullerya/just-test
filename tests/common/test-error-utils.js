import { test } from '@gullerya/just-test';
import { assert } from '@gullerya/just-test/assert';
import { processError } from '../../src/common/error-utils.js';

test('not an error return null', () => {
	let r = processError(null);
	assert.strictEqual(r, null);

	r = processError(123);
	assert.strictEqual(r, null);

	r = processError('test');
	assert.strictEqual(r, null);

	r = processError({});
	assert.strictEqual(r, null);

	r = processError(undefined);
	assert.strictEqual(r, null);
});

test('processError with valid Error object - shallow', () => {
	const error = new TypeError('This is a type error');
	const r = processError(error);

	assert.strictEqual(r.name, 'TypeError');
	assert.strictEqual(r.type, 'TypeError');
	assert.strictEqual(r.message, 'This is a type error');
	assert.strictEqual(r.cause, undefined);
	assert.isTrue(Array.isArray(r.stacktrace));
	assert.isTrue(r.stacktrace.length > 0);
});

test('processError with valid Error object - nested', () => {
	const error = new TypeError('This is a type error', { cause: new ReferenceError('This is a reference error') });
	const r = processError(error);

	assert.strictEqual(r.name, 'TypeError');
	assert.strictEqual(r.type, 'TypeError');
	assert.strictEqual(r.message, 'This is a type error');
	assert.isTrue(Array.isArray(r.stacktrace));
	assert.isTrue(r.stacktrace.length > 0);

	assert.strictEqual(r.cause.name, 'ReferenceError');
	assert.strictEqual(r.cause.type, 'ReferenceError');
	assert.strictEqual(r.cause.message, 'This is a reference error');
	assert.strictEqual
	assert.isTrue(Array.isArray(r.cause.stacktrace));
	assert.isTrue(r.cause.stacktrace.length > 0);
});
