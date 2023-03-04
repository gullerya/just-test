import { assert } from 'chai';
import { test } from '@gullerya/just-test';
import RangeCov from '../../src/coverage/model/range-cov.js';
import { merge } from '../../src/coverage/model/range-utils.js';

test('RangeCov - negative (beg not a number)', () => {
	assert.throws(() => new RangeCov('some'), 'beg MUST be a non-negative number');
});

test('RangeCov - negative (beg is negative)', () => {
	assert.throws(() => new RangeCov(-1), 'beg MUST be a non-negative number');
});

test('RangeCov - negative (end not a number)', () => {
	assert.throws(() => new RangeCov(0, 'some'), 'end MUST be a non-negative number');
});

test('RangeCov - negative (end negative)', () => {
	assert.throws(() => new RangeCov(0, -1), 'end MUST be a non-negative number');
});

test('RangeCov - negative (beg lesser than end)', () => {
	assert.throws(() => new RangeCov(3, 1), 'beg MUST precede end');
});

test('range - isAfterNonAdjacent / isBeforeNonAdjacent', () => {
	const a1 = new RangeCov(0, 3, 1);
	const b1 = new RangeCov(4, 7, 1);

	assert.isTrue(a1.isBeforeNonAdjacent(b1));
	assert.isTrue(b1.isAfterNonAdjacent(a1));

	const a2 = new RangeCov(0, 3, 1);
	const b2 = new RangeCov(3, 7, 1);

	assert.isFalse(a2.isBeforeNonAdjacent(b2));
	assert.isFalse(b2.isAfterNonAdjacent(a2));
});

test('range - isWithin / contains', () => {
	const a1 = new RangeCov(0, 7, 1);
	const b1 = new RangeCov(4, 7, 1);

	assert.isTrue(a1.contains(b1));
	assert.isTrue(b1.isWithin(a1));

	const a2 = new RangeCov(0, 6, 1);
	const b2 = new RangeCov(3, 7, 1);

	assert.isFalse(a2.isWithin(b2));
	assert.isFalse(b2.isWithin(a2));
	assert.isFalse(a2.contains(b2));
	assert.isFalse(b2.contains(a2));
});

test('merge distant ranges', () => {
	const a = new RangeCov(0, 3, 1);
	const b = new RangeCov(4, 7, 1);
	const m = merge(b, a);
	assert.deepEqual(m, [a, b]);
});

test('merge adjacent ranges, same hits', () => {
	const a = new RangeCov(0, 3, 1);
	const b = new RangeCov(3, 7, 1);
	const m = merge(b, a);
	assert.deepEqual(m, [{ beg: 0, end: 7, hits: 1 }]);
});

test('merge adjacent ranges, different hits', () => {
	const a = new RangeCov(0, 3, 1);
	const b = new RangeCov(3, 7, 2);
	const m = merge(b, a);
	assert.deepEqual(m, [a, b]);
});

test('merge nested ranges, same hits', () => {
	const a = new RangeCov(0, 7, 1);
	const b = new RangeCov(3, 7, 1);
	const m = merge(b, a);
	assert.deepEqual(m, [{ beg: 0, end: 7, hits: 1 }]);
});

test('merge nested ranges, different hits', () => {
	const a = new RangeCov(0, 7, 1);
	const b = new RangeCov(3, 6, 2);
	const m = merge(b, a);
	assert.deepEqual(m, [
		{ beg: 0, end: 3, hits: 1 },
		{ beg: 3, end: 6, hits: 2 },
		{ beg: 6, end: 7, hits: 1 }
	]);
});