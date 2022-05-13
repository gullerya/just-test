import { assert } from 'chai';
import { getSuite } from '@gullerya/just-test/suite';
import RangeCov from '/aut/bin/common/models/coverage/range-cov.js';
import { merge } from '/aut/bin/common/models/coverage/range-utils.js';

const suite = getSuite('Coverage model');

suite.test('RangeCov - negative (beg not a number)', () => {
	assert.throws(() => new RangeCov('some'), 'beg MUST be a non-negative number');
});

suite.test('RangeCov - negative (beg is negative)', () => {
	new RangeCov(-1);
}, {
	expectError: 'beg MUST be a non-negative number'
});

suite.test('RangeCov - negative (end not a number)', () => {
	new RangeCov(0, 'some');
}, {
	expectError: 'end MUST be a non-negative number'
});

suite.test('RangeCov - negative (end negative)', () => {
	new RangeCov(0, -1);
}, {
	expectError: 'end MUST be a non-negative number'
});

suite.test('RangeCov - negative (beg lesser than end)', () => {
	new RangeCov(3, 1);
}, {
	expectError: 'beg MUST preceed end'
});

suite.test('range - isAfterNonAdjacent / isBeforeNonAdjacent', () => {
	const a1 = new RangeCov(0, 3, 1);
	const b1 = new RangeCov(4, 7, 1);

	assert.isTrue(a1.isBeforeNonAdjacent(b1));
	assert.isTrue(b1.isAfterNonAdjacent(a1));

	const a2 = new RangeCov(0, 3, 1);
	const b2 = new RangeCov(3, 7, 1);

	assert.isFalse(a2.isBeforeNonAdjacent(b2));
	assert.isFalse(b2.isAfterNonAdjacent(a2));
});

suite.test('range - isWithin / contains', () => {
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

suite.test('merge distant ranges', () => {
	const a = new RangeCov(0, 3, 1);
	const b = new RangeCov(4, 7, 1);
	const m = merge(b, a);
	assert.deepEqual(m, [a, b]);
});

suite.test('merge adjacent ranges, same hits', () => {
	const a = new RangeCov(0, 3, 1);
	const b = new RangeCov(3, 7, 1);
	const m = merge(b, a);
	assert.deepEqual(m, [{ beg: 0, end: 7, hits: 1 }]);
});

suite.test('merge adjacent ranges, different hits', () => {
	const a = new RangeCov(0, 3, 1);
	const b = new RangeCov(3, 7, 2);
	const m = merge(b, a);
	assert.deepEqual(m, [a, b]);
});

suite.test('merge nested ranges, same hits', () => {
	const a = new RangeCov(0, 7, 1);
	const b = new RangeCov(3, 7, 1);
	const m = merge(b, a);
	assert.deepEqual(m, [{ beg: 0, end: 7, hits: 1 }]);
});

suite.test('merge nested ranges, different hits', () => {
	const a = new RangeCov(0, 7, 1);
	const b = new RangeCov(3, 6, 2);
	const m = merge(b, a);
	assert.deepEqual(m, [
		{ beg: 0, end: 3, hits: 1 },
		{ beg: 3, end: 6, hits: 2 },
		{ beg: 6, end: 7, hits: 1 }
	]);
});