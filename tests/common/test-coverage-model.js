import RangeCov from '/aut/bin/common/models/coverage/range-cov.js';
import { merge } from '/aut/bin/common/models/coverage/range-utils.js';

const suite = getSuite('Coverage model');

suite.test('RangeCov - negative (beg not a number)', () => {
	new RangeCov('some');
}, {
	expectError: 'beg MUST be a non-negative number'
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

suite.test('merge distant ranges', test => {
	const a = new RangeCov(0, 3, 1);
	const b = new RangeCov(4, 7, 1);
	const m = merge(b, a);
	test.assert.deepEqual(m, [a, b]);
});

suite.test('merge adjacent ranges, same hits', test => {
	const a = new RangeCov(0, 3, 1);
	const b = new RangeCov(3, 7, 1);
	const m = merge(b, a);
	test.assert.deepEqual(m, [{ beg: 0, end: 7, hits: 1 }]);
});

suite.test('merge adjacent ranges, different hits', test => {
	const a = new RangeCov(0, 3, 1);
	const b = new RangeCov(3, 7, 2);
	const m = merge(b, a);
	test.assert.deepEqual(m, [a, b]);
});

suite.test('merge nested ranges, same hits', test => {
	const a = new RangeCov(0, 7, 1);
	const b = new RangeCov(3, 7, 1);
	const m = merge(b, a);
	test.assert.deepEqual(m, [{ beg: 0, end: 7, hits: 1 }]);
});

suite.test('merge nested ranges, different hits', test => {
	const a = new RangeCov(0, 7, 1);
	const b = new RangeCov(3, 6, 2);
	const m = merge(b, a);
	test.assert.deepEqual(m, [
		{ beg: 0, end: 3, hits: 1 },
		{ beg: 3, end: 6, hits: 2 },
		{ beg: 6, end: 7, hits: 1 }
	]);
});