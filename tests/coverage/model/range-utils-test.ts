import { test } from '@gullerya/just-test';
import { assert } from '@gullerya/just-test/assert';
import RangeCov from '../../../src/coverage/model/range-cov.ts';
import LineCov from '../../../src/coverage/model/line-cov.ts';
import BaseRange from '../../../src/coverage/model/base-range.ts';
import FileCov from '../../../src/coverage/model/file-cov.ts';
import { merge, calcRangeCoverage } from '../../../src/coverage/model/range-utils.ts';

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

//	-----------------------------------------------------------------
//	merge — more cases (overlap, identical, ordering)
//	-----------------------------------------------------------------

test('merge distant ranges, reverse order', () => {
	const a = new RangeCov(0, 3, 1);
	const b = new RangeCov(4, 7, 1);
	const m = merge(a, b);
	assert.deepEqual(m, [a, b]);
});

test('merge identical ranges with same hits collapses to one', () => {
	const a = new RangeCov(0, 5, 2);
	const b = new RangeCov(0, 5, 2);
	const m = merge(a, b);
	assert.deepEqual(m, [{ beg: 0, end: 5, hits: 2 }]);
});

test('merge overlapping ranges with different hits emits segmented ranges', () => {
	//	a: [0,6,1), b: [3,9,2) — points sort to 0,3,6,9 → 3 segments
	const a = new RangeCov(0, 6, 1);
	const b = new RangeCov(3, 9, 2);
	const m = merge(a, b);
	//	each emitted range's hits is whichever range includes its `beg`
	assert.strictEqual(m.length, 3);
	assert.deepEqual(m[0], { beg: 0, end: 3, hits: 1 });
	assert.deepEqual(m[2], { beg: 6, end: 9, hits: 2 });
});

//	-----------------------------------------------------------------
//	calcRangeCoverage
//	-----------------------------------------------------------------

test('calcRangeCoverage - no covered ranges returns {min:MAX,max:0}', () => {
	const tested = new RangeCov(0, 10, 0);
	const { min, max } = calcRangeCoverage(tested, []);
	assert.strictEqual(min, Number.MAX_VALUE);
	assert.strictEqual(max, 0);
});

test('calcRangeCoverage - covered range outside tested reports no hits', () => {
	const tested = new RangeCov(0, 5, 0);
	const cov = [new RangeCov(10, 20, 7)];
	const { min, max } = calcRangeCoverage(tested, cov);
	assert.strictEqual(min, Number.MAX_VALUE);
	assert.strictEqual(max, 0);
});

test('calcRangeCoverage - single overlapping range reports its hits as both min and max', () => {
	const tested = new RangeCov(0, 10, 0);
	const cov = [new RangeCov(0, 10, 4)];
	const { min, max } = calcRangeCoverage(tested, cov);
	assert.strictEqual(min, 4);
	assert.strictEqual(max, 4);
});

test('calcRangeCoverage - multiple overlapping ranges report real min and max', () => {
	const tested = new RangeCov(0, 10, 0);
	const cov = [new RangeCov(0, 5, 2), new RangeCov(5, 10, 7)];
	const { min, max } = calcRangeCoverage(tested, cov);
	assert.strictEqual(min, 2);
	assert.strictEqual(max, 7);
});

test('calcRangeCoverage - tested range fully inside a covered range counts that range', () => {
	const tested = new RangeCov(3, 6, 0);
	const cov = [new RangeCov(0, 10, 5)];
	const { min, max } = calcRangeCoverage(tested, cov);
	assert.strictEqual(min, 5);
	assert.strictEqual(max, 5);
});

//	-----------------------------------------------------------------
//	BaseRange / LineCov / FileCov boundaries
//	-----------------------------------------------------------------

test('BaseRange.includes - boundaries: beg inclusive, end exclusive', () => {
	const r = new RangeCov(2, 5, 0);
	assert.isTrue(r.includes(2));
	assert.isTrue(r.includes(4));
	assert.isFalse(r.includes(5));
	assert.isFalse(r.includes(1));
});

test('BaseRange.includes - negative (point not a number)', () => {
	const r = new RangeCov(0, 5, 0);
	assert.throws(() => r.includes('x' as any), 'invalid point parameter');
});

test('BaseRange.validate - negative (null)', () => {
	assert.throws(() => BaseRange.validate(null), 'invalid range parameter');
});

test('BaseRange.validate - negative (missing beg/end)', () => {
	assert.throws(() => BaseRange.validate({} as any), 'invalid range parameter');
});

test('LineCov - negative (number not a number)', () => {
	assert.throws(() => new LineCov('x' as any, 0, 5), 'line number MUST be a non-negative number');
});

test('LineCov - negative (number is negative)', () => {
	assert.throws(() => new LineCov(-1, 0, 5), 'line number MUST be a non-negative number');
});

test('FileCov - negative (url not a string)', () => {
	assert.throws(() => new FileCov(null as any), 'url MUST be a non-empty string');
});

test('FileCov - addRangeCov then addLineCov chain', () => {
	const fc = new FileCov('src/x.ts');
	const r = new RangeCov(0, 10, 1);
	const l = new LineCov(1, 0, 10);
	const self1 = fc.addRangeCov(r);
	const self2 = fc.addLineCov(l);
	assert.strictEqual(self1, fc);
	assert.strictEqual(self2, fc);
	assert.strictEqual(fc.ranges.length, 1);
	assert.strictEqual(fc.lines.length, 1);
});

test('FileCov.addRangeCov - distant-after range appended to tail', () => {
	const fc = new FileCov('src/x.ts');
	fc.addRangeCov(new RangeCov(0, 5, 1));
	fc.addRangeCov(new RangeCov(10, 20, 1));
	assert.strictEqual(fc.ranges.length, 2);
	assert.strictEqual(fc.ranges[0].beg, 0);
	assert.strictEqual(fc.ranges[1].beg, 10);
});

test('FileCov.addRangeCov - new range before an existing one gets inserted at head', () => {
	const fc = new FileCov('src/x.ts');
	fc.addRangeCov(new RangeCov(10, 20, 1));
	fc.addRangeCov(new RangeCov(0, 5, 1));
	assert.strictEqual(fc.ranges.length, 2);
	assert.strictEqual(fc.ranges[0].beg, 0);
	assert.strictEqual(fc.ranges[1].beg, 10);
});

test('FileCov.addRangeCov - nested range with same hits collapses', () => {
	const fc = new FileCov('src/x.ts');
	fc.addRangeCov(new RangeCov(0, 10, 1));
	fc.addRangeCov(new RangeCov(3, 6, 1));
	assert.strictEqual(fc.ranges.length, 1);
	assert.deepEqual(fc.ranges[0], { beg: 0, end: 10, hits: 1 });
});

test('FileCov.addFunctionCov - appends and returns self', () => {
	const fc = new FileCov('src/x.ts');
	const self = fc.addFunctionCov({ name: 'f' } as any);
	assert.strictEqual(self, fc);
	assert.strictEqual(fc.functions.length, 1);
});

test('BaseRange.validate - rejects primitives', () => {
	assert.throws(() => BaseRange.validate(42 as any), 'invalid range parameter');
	assert.throws(() => BaseRange.validate('x' as any), 'invalid range parameter');
});

test('BaseRange.validate - rejects wrong beg/end types individually', () => {
	assert.throws(() => BaseRange.validate({ beg: 'x', end: 5 } as any), 'invalid range parameter');
	assert.throws(() => BaseRange.validate({ beg: 0, end: 'x' } as any), 'invalid range parameter');
});

test('BaseRange.validate - accepts multiple valid ranges', () => {
	assert.doesNotThrow(() => BaseRange.validate(
		{ beg: 0, end: 1 } as any,
		{ beg: 2, end: 3 } as any
	));
});

test('BaseRange - equal ranges contain each other and are mutually within', () => {
	const a = new RangeCov(0, 5, 1);
	const b = new RangeCov(0, 5, 2);
	assert.isTrue(a.contains(b));
	assert.isTrue(b.contains(a));
	assert.isTrue(a.isWithin(b));
	assert.isTrue(b.isWithin(a));
});

test('BaseRange - adjacent ranges do not contain each other', () => {
	const a = new RangeCov(0, 3, 1);
	const b = new RangeCov(3, 7, 1);
	assert.isFalse(a.contains(b));
	assert.isFalse(b.contains(a));
	assert.isFalse(a.isWithin(b));
	assert.isFalse(b.isWithin(a));
});

test('BaseRange - positional predicates reject invalid inputs', () => {
	const r = new RangeCov(0, 5, 0);
	assert.throws(() => r.isAfterNonAdjacent(null as any), 'invalid range parameter');
	assert.throws(() => r.isBeforeNonAdjacent(null as any), 'invalid range parameter');
	assert.throws(() => r.isWithin({} as any), 'invalid range parameter');
	assert.throws(() => r.contains('x' as any), 'invalid range parameter');
});

test('RangeCov - negative (hits not a number)', () => {
	assert.throws(() => new RangeCov(0, 5, 'x' as any), 'hits MUST be a non-negative number');
});

test('RangeCov - negative (hits is negative)', () => {
	assert.throws(() => new RangeCov(0, 5, -1), 'hits MUST be a non-negative number');
});

test('LineCov - constructs with valid inputs and inherits range methods', () => {
	const l = new LineCov(3, 10, 20);
	assert.strictEqual(l.number, 3);
	assert.strictEqual(l.beg, 10);
	assert.strictEqual(l.end, 20);
	assert.isTrue(l.includes(15));
});

test('FileCov - negative (empty string url)', () => {
	assert.throws(() => new FileCov(''), 'url MUST be a non-empty string');
});

test('FileCov - is frozen, structural fields cannot be reassigned', () => {
	const fc = new FileCov('src/x.ts');
	assert.throws(() => { (fc as any).url = 'other'; });
	//	array contents are still mutable — Object.freeze is shallow
	fc.lines.push(new LineCov(0, 0, 1));
	assert.strictEqual(fc.lines.length, 1);
});

test('FileCov.addRangeCov - smaller range inside larger with same hits collapses', () => {
	const fc = new FileCov('src/x.ts');
	fc.addRangeCov(new RangeCov(3, 6, 1));
	fc.addRangeCov(new RangeCov(0, 10, 1));
	//	new range contains the existing one — merge path via `.contains(tr)`
	assert.strictEqual(fc.ranges.length, 1);
	assert.deepEqual(fc.ranges[0], { beg: 0, end: 10, hits: 1 });
});