import { test } from '@gullerya/just-test';
import { assert } from '@gullerya/just-test/assert';
import { assert as subject, AssertionError } from '../../src/common/assert-utils.ts';

//	Helper: run fn, return the thrown error or null. Using the harness's
//	`assert.throws` against the subject would be circular when we want to
//	inspect AssertionError's own shape, so we catch manually here.
function catchThrown(fn: () => unknown): unknown {
	try {
		fn();
	} catch (e) {
		return e;
	}
	return null;
}

//	AssertionError
//
test('AssertionError - shape', () => {
	const e = new AssertionError('reason', 1, 2, 'equal');
	assert.isTrue(e instanceof Error);
	assert.isTrue(e instanceof AssertionError);
	assert.strictEqual(e.actual, 1);
	assert.strictEqual(e.expected, 2);
	assert.strictEqual(e.operator, 'equal');
	assert.isTrue(e.message.includes(`'equal'`));
	assert.isTrue(e.message.includes('message: reason'));
});

test('AssertionError - message embeds JSON of actual/expected', () => {
	const e = new AssertionError('m', { a: 1 }, [1, 2], 'x');
	assert.isTrue(e.message.includes(`'{"a":1}'`));
	assert.isTrue(e.message.includes(`'[1,2]'`));
});

//	equal / notEqual (loose)
//
test('equal - passes on loose equality', () => {
	subject.equal(1, '1');
	subject.equal(null, undefined);
});

test('equal - throws on inequality', () => {
	const e = catchThrown(() => subject.equal(1, 2, 'mismatch'));
	assert.isTrue(e instanceof AssertionError);
	assert.strictEqual((e as AssertionError).operator, 'equal');
});

test('notEqual - passes on inequality', () => {
	subject.notEqual(1, 2);
	subject.notEqual(null, 0);
});

test('notEqual - throws on loose equality', () => {
	const e = catchThrown(() => subject.notEqual(1, '1'));
	assert.isTrue(e instanceof AssertionError);
	assert.strictEqual((e as AssertionError).operator, 'notEqual');
});

//	strictEqual / notStrictEqual
//
test('strictEqual - passes on identity', () => {
	subject.strictEqual(1, 1);
	subject.strictEqual('a', 'a');
});

test('strictEqual - throws on loose-but-not-strict equality', () => {
	const e = catchThrown(() => subject.strictEqual(1, '1' as unknown as number));
	assert.isTrue(e instanceof AssertionError);
	assert.strictEqual((e as AssertionError).operator, 'strictEqual');
});

test('notStrictEqual - passes on non-identity', () => {
	subject.notStrictEqual(1, '1' as unknown as number);
	subject.notStrictEqual({}, {});
});

test('notStrictEqual - throws on identity', () => {
	const e = catchThrown(() => subject.notStrictEqual(1, 1));
	assert.isTrue(e instanceof AssertionError);
	assert.strictEqual((e as AssertionError).operator, 'notStrictEqual');
});

//	match / doesNotMatch
//
test('match - passes when regex hits', () => {
	subject.match('hello world', /world/);
});

test('match - throws when regex misses', () => {
	const e = catchThrown(() => subject.match('abc', /xyz/));
	assert.isTrue(e instanceof AssertionError);
	assert.strictEqual((e as AssertionError).operator, 'match');
});

test('doesNotMatch - passes when regex misses', () => {
	subject.doesNotMatch('abc', /xyz/);
});

test('doesNotMatch - throws when regex hits', () => {
	const e = catchThrown(() => subject.doesNotMatch('hello', /ell/));
	assert.isTrue(e instanceof AssertionError);
	assert.strictEqual((e as AssertionError).operator, 'doesNotMatch');
});

//	deepEqual
//
test('deepEqual - passes on shallow equality', () => {
	subject.deepEqual({ a: 1, b: '2' }, { a: 1, b: '2' });
});

test('deepEqual - passes on nested equality', () => {
	subject.deepEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 1 } } });
});

test('deepEqual - passes when both are null', () => {
	subject.deepEqual(null as unknown as object, null as unknown as object);
});

test('deepEqual - uses loose comparison for leaves', () => {
	subject.deepEqual({ a: 1 } as object, { a: '1' } as unknown as object);
});

test('deepEqual - throws on mismatched leaf', () => {
	const e = catchThrown(() => subject.deepEqual({ a: 1 }, { a: 2 }));
	assert.isTrue(e instanceof AssertionError);
	assert.strictEqual((e as AssertionError).operator, 'deepEqual');
});

test('deepEqual - flags extra key on actual (symmetric)', () => {
	const e = catchThrown(() => subject.deepEqual({ a: 1, b: 2 } as object, { a: 1 } as object));
	assert.isTrue(e instanceof AssertionError);
	assert.strictEqual((e as AssertionError).operator, 'deepEqual');
});

test('deepEqual - flags missing key on actual (symmetric)', () => {
	const e = catchThrown(() => subject.deepEqual({ a: 1 } as object, { a: 1, b: 2 } as object));
	assert.isTrue(e instanceof AssertionError);
	assert.strictEqual((e as AssertionError).operator, 'deepEqual');
});

test('deepEqual - flags nested extra key on actual (symmetric)', () => {
	const e = catchThrown(() => subject.deepEqual(
		{ outer: { a: 1, extra: 9 } } as object,
		{ outer: { a: 1 } } as object
	));
	assert.isTrue(e instanceof AssertionError);
});

test('deepEqual - flags nested missing key on actual (symmetric)', () => {
	const e = catchThrown(() => subject.deepEqual(
		{ outer: { a: 1 } } as object,
		{ outer: { a: 1, extra: 9 } } as object
	));
	assert.isTrue(e instanceof AssertionError);
});

//	one-sided nullish: must surface as AssertionError, not TypeError —
//	a failed assertion shouldn't crash the test runtime
test('deepEqual - throws AssertionError when actual is null and expected is an object', () => {
	const e = catchThrown(() => subject.deepEqual(null as unknown as object, { a: 1 }));
	assert.isTrue(e instanceof AssertionError);
	assert.strictEqual((e as AssertionError).operator, 'deepEqual');
});

test('deepEqual - throws AssertionError when expected is null and actual is an object', () => {
	const e = catchThrown(() => subject.deepEqual({ a: 1 } as object, null as unknown as object));
	assert.isTrue(e instanceof AssertionError);
	assert.strictEqual((e as AssertionError).operator, 'deepEqual');
});

test('deepEqual - throws AssertionError when actual is undefined and expected is an object', () => {
	const e = catchThrown(() => subject.deepEqual(undefined as unknown as object, { a: 1 }));
	assert.isTrue(e instanceof AssertionError);
	assert.strictEqual((e as AssertionError).operator, 'deepEqual');
});

test('deepEqual - throws AssertionError when expected is undefined and actual is an object', () => {
	const e = catchThrown(() => subject.deepEqual({ a: 1 } as object, undefined as unknown as object));
	assert.isTrue(e instanceof AssertionError);
	assert.strictEqual((e as AssertionError).operator, 'deepEqual');
});

//	deepStrictEqual
//
test('deepStrictEqual - passes on shallow identity', () => {
	subject.deepStrictEqual({ a: 1, b: '2' }, { a: 1, b: '2' });
});

test('deepStrictEqual - passes when both are null', () => {
	subject.deepStrictEqual(null as unknown as object, null as unknown as object);
});

test('deepStrictEqual - passes when both are undefined', () => {
	subject.deepStrictEqual(undefined as unknown as object, undefined as unknown as object);
});

test('deepStrictEqual - throws on loose-but-not-strict leaf', () => {
	const e = catchThrown(() => subject.deepStrictEqual({ a: 1 } as object, { a: '1' } as unknown as object));
	assert.isTrue(e instanceof AssertionError);
	assert.strictEqual((e as AssertionError).operator, 'deepStrictEqual');
});

test('deepStrictEqual - flags extra key on actual (symmetric)', () => {
	const e = catchThrown(() => subject.deepStrictEqual({ a: 1, b: 2 } as object, { a: 1 } as object));
	assert.isTrue(e instanceof AssertionError);
});

test('deepStrictEqual - throws AssertionError when actual is null and expected is an object', () => {
	const e = catchThrown(() => subject.deepStrictEqual(null as unknown as object, { a: 1 }));
	assert.isTrue(e instanceof AssertionError);
	assert.strictEqual((e as AssertionError).operator, 'deepStrictEqual');
});

test('deepStrictEqual - throws AssertionError when expected is null and actual is an object', () => {
	const e = catchThrown(() => subject.deepStrictEqual({ a: 1 } as object, null as unknown as object));
	assert.isTrue(e instanceof AssertionError);
	assert.strictEqual((e as AssertionError).operator, 'deepStrictEqual');
});

test('deepStrictEqual - throws AssertionError when one side is null and the other undefined', () => {
	const e = catchThrown(() => subject.deepStrictEqual(null as unknown as object, undefined as unknown as object));
	assert.isTrue(e instanceof AssertionError);
	assert.strictEqual((e as AssertionError).operator, 'deepStrictEqual');
});

//	throws / doesNotThrow
//
test('throws - passes when fn throws without error spec', () => {
	subject.throws(() => { throw new Error('boom'); }, undefined);
});

test('throws - passes on class match', () => {
	subject.throws(() => { throw new TypeError('x'); }, TypeError);
});

test('throws - passes on substring match', () => {
	subject.throws(() => { throw new Error('boom and stuff'); }, 'boom');
});

test('throws - passes on regex match', () => {
	subject.throws(() => { throw new Error('boom'); }, /bo+m/);
});

test('throws - fails when fn does not throw', () => {
	const e = catchThrown(() => subject.throws(() => { }, undefined));
	assert.isTrue(e instanceof AssertionError);
	assert.strictEqual((e as AssertionError).operator, 'throws');
});

test('throws - fails on class mismatch', () => {
	const e = catchThrown(() => subject.throws(() => { throw new Error('x'); }, TypeError));
	assert.isTrue(e instanceof AssertionError);
});

test('throws - fails on substring mismatch', () => {
	const e = catchThrown(() => subject.throws(() => { throw new Error('x'); }, 'never'));
	assert.isTrue(e instanceof AssertionError);
});

test('throws - fails when fn returns a Promise', () => {
	const e = catchThrown(() => subject.throws(() => Promise.resolve(), undefined));
	assert.isTrue(e instanceof AssertionError);
	assert.isTrue((e as Error).message.includes(`use 'rejects'`));
});

test('doesNotThrow - passes when fn does not throw', () => {
	subject.doesNotThrow(() => { });
});

test('doesNotThrow - fails when fn throws', () => {
	const e = catchThrown(() => subject.doesNotThrow(() => { throw new Error('x'); }));
	assert.isTrue(e instanceof AssertionError);
	assert.strictEqual((e as AssertionError).operator, 'doesNotThrow');
});

test('doesNotThrow - fails when fn returns a Promise', () => {
	const e = catchThrown(() => subject.doesNotThrow(() => Promise.resolve()));
	assert.isTrue(e instanceof AssertionError);
	assert.isTrue((e as Error).message.includes(`use 'doesNotReject'`));
});

//	rejects / doesNotReject
//
test('rejects - passes when async fn rejects (no spec)', async () => {
	await subject.rejects(async () => { throw new Error('x'); }, undefined);
});

test('rejects - passes on class match', async () => {
	await subject.rejects(async () => { throw new TypeError('x'); }, TypeError);
});

test('rejects - passes on substring match', async () => {
	await subject.rejects(async () => { throw new Error('boom'); }, 'boo');
});

test('rejects - fails when async fn resolves', async () => {
	let caught: unknown = null;
	try {
		await subject.rejects(async () => 42, undefined);
	} catch (e) {
		caught = e;
	}
	assert.isTrue(caught instanceof AssertionError);
	assert.strictEqual((caught as AssertionError).operator, 'rejects');
});

test('rejects - fails on class mismatch', async () => {
	let caught: unknown = null;
	try {
		await subject.rejects(async () => { throw new Error('x'); }, TypeError);
	} catch (e) {
		caught = e;
	}
	assert.isTrue(caught instanceof AssertionError);
});

test('doesNotReject - passes when async fn resolves', async () => {
	await subject.doesNotReject(async () => 42);
});

test('doesNotReject - fails when async fn rejects', async () => {
	let caught: unknown = null;
	try {
		await subject.doesNotReject(async () => { throw new Error('x'); });
	} catch (e) {
		caught = e;
	}
	assert.isTrue(caught instanceof AssertionError);
	assert.strictEqual((caught as AssertionError).operator, 'doesNotReject');
});

//	isTrue / isFalse
//
test('isTrue - passes only on the boolean true', () => {
	subject.isTrue(true);
	assert.isTrue(catchThrown(() => subject.isTrue(1 as unknown as boolean)) instanceof AssertionError);
	assert.isTrue(catchThrown(() => subject.isTrue('true' as unknown as boolean)) instanceof AssertionError);
});

test('isFalse - passes only on the boolean false', () => {
	subject.isFalse(false);
	assert.isTrue(catchThrown(() => subject.isFalse(0 as unknown as boolean)) instanceof AssertionError);
	assert.isTrue(catchThrown(() => subject.isFalse('' as unknown as boolean)) instanceof AssertionError);
});

//	fail
//
test('fail - always throws AssertionError with fail operator', () => {
	const e = catchThrown(() => subject.fail('nope'));
	assert.isTrue(e instanceof AssertionError);
	assert.strictEqual((e as AssertionError).operator, 'fail');
	assert.isTrue((e as Error).message.includes('message: nope'));
});
