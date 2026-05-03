import { test } from '@gullerya/just-test';
import { assert } from '@gullerya/just-test/assert';
import { rehydrateRun, rehydrateError } from '../../../src/runner/environments/run-rehydrator.ts';
import { TestError } from '../../../src/testing/model/test-error.ts';
import { TestRun } from '../../../src/testing/model/test-run.ts';
import { STATUS } from '../../../src/common/constants.ts';

//	rehydrateRun
//
test('rehydrateRun - plain object with all fields round-trips into TestRun', () => {
	const plain = {
		status: STATUS.PASS,
		time: 12.5,
		timestamp: 1700000000000,
		coverage: [{ url: './x.js', functions: [] }],
		error: null
	};
	const run = rehydrateRun(plain);
	assert.isTrue(run instanceof TestRun);
	assert.strictEqual(run.status, STATUS.PASS);
	assert.strictEqual(run.time, 12.5);
	assert.strictEqual(run.timestamp, 1700000000000);
	assert.deepEqual(run.coverage, [{ url: './x.js', functions: [] }]);
	assert.strictEqual(run.error, null);
});

test('rehydrateRun - missing time/timestamp/coverage default to 0/0/null', () => {
	const run = rehydrateRun({ status: STATUS.PASS });
	assert.strictEqual(run.time, 0);
	assert.strictEqual(run.timestamp, 0);
	assert.strictEqual(run.coverage, null);
});

test('rehydrateRun - missing error leaves run.error null', () => {
	const run = rehydrateRun({ status: STATUS.PASS });
	assert.strictEqual(run.error, null);
});

test('rehydrateRun - error field is rehydrated into TestError', () => {
	const plain = {
		status: STATUS.ERROR,
		error: {
			name: 'Error',
			type: 'TypeError',
			message: 'nope',
			stack: 'Error: nope\n  at x',
			cause: null
		}
	};
	const run = rehydrateRun(plain);
	assert.isTrue(run.error instanceof TestError);
	assert.strictEqual(run.error.type, 'TypeError');
	assert.strictEqual(run.error.message, 'nope');
});

//	rehydrateError
//
test('rehydrateError - preserves original type from plain.type', () => {
	const plain = {
		name: 'Error',
		type: 'AssertionError',
		message: 'expected 1 to equal 2',
		stack: 'AssertionError: expected ...',
		cause: null
	};
	const te = rehydrateError(plain);
	assert.isTrue(te instanceof TestError);
	//	the whole point of rehydrateError: Error across postMessage loses
	//	its original constructor.name, so plain.type is the only source of
	//	truth for the original class (AssertionError/TypeError/…)
	assert.strictEqual(te.type, 'AssertionError');
	assert.strictEqual(te.name, 'Error');
	assert.strictEqual(te.message, 'expected 1 to equal 2');
	assert.strictEqual(te.stack, 'AssertionError: expected ...');
	assert.strictEqual(te.cause, null);
});

test('rehydrateError - falls back to fromError-derived type when plain.type missing', () => {
	const plain = {
		name: 'Error',
		message: 'x',
		stack: 'stack'
	};
	const te = rehydrateError(plain);
	//	no plain.type → te.type comes from TestError.fromError, which
	//	reads error.constructor.name — we built a plain Error, so 'Error'
	assert.strictEqual(te.type, 'Error');
});

test('rehydrateError - cause chain rehydrates recursively', () => {
	const plain = {
		name: 'Error',
		type: 'OuterError',
		message: 'outer',
		stack: 'outer-stack',
		cause: {
			name: 'Error',
			type: 'InnerError',
			message: 'inner',
			stack: 'inner-stack',
			cause: null
		}
	};
	const te = rehydrateError(plain);
	assert.strictEqual(te.type, 'OuterError');
	assert.isTrue(te.cause instanceof TestError);
	assert.strictEqual(te.cause.type, 'InnerError');
	assert.strictEqual(te.cause.message, 'inner');
	assert.strictEqual(te.cause.cause, null);
});

test('rehydrateError - missing message/name/stack defaults to empty/"Error"/empty', () => {
	const te = rehydrateError({});
	assert.strictEqual(te.name, 'Error');
	assert.strictEqual(te.message, '');
	assert.strictEqual(te.stack, '');
});
