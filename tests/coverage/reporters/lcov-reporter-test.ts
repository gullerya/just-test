import { EOL } from 'node:os';
import { test } from '../../../src/runner/just-test.ts';
import { assert } from '../../../src/common/assert-utils.ts';
import lcovReporter from '../../../src/coverage/reporters/lcov-reporter.ts';

function makeFileCov(url: string, lines: Array<{ number: number; beg: number; end: number }>, ranges: Array<{ beg: number; end: number; hits: number }>) {
	return { url, lines, ranges, functions: [] };
}

function isContentless(s: string): boolean {
	return !s.includes('TN:') && !s.includes('SF:') && !s.includes('DA:');
}

test('lcov convert - empty test and file coverages produces no records', () => {
	const out = lcovReporter.convert({ testCoverages: [], fileCoverages: [] });
	assert.isTrue(isContentless(out));
});

test('lcov convert - testCoverage with null coverage is skipped', () => {
	const out = lcovReporter.convert({
		testCoverages: [{ testId: 'some-id', coverage: null }],
		fileCoverages: []
	});
	assert.isTrue(isContentless(out));
});

test('lcov convert - testCoverage with non-array coverage is skipped', () => {
	const out = lcovReporter.convert({
		testCoverages: [{ testId: 'some-id', coverage: 'not an array' as any }],
		fileCoverages: []
	});
	assert.isTrue(isContentless(out));
});

test('lcov convert - testCoverage with empty coverage array is skipped', () => {
	const out = lcovReporter.convert({
		testCoverages: [{ testId: 'some-id', coverage: [] }],
		fileCoverages: []
	});
	assert.isTrue(isContentless(out));
});

test('lcov convert - single test, single file, 2-line shape', () => {
	const fc = makeFileCov(
		'src/a.ts',
		[
			{ number: 1, beg: 0, end: 10 },
			{ number: 2, beg: 10, end: 20 }
		],
		[{ beg: 0, end: 20, hits: 3 }]
	);
	const out = lcovReporter.convert({
		testCoverages: [{ testId: 'suite => t1', coverage: [fc] }],
		fileCoverages: []
	});

	assert.isTrue(out.includes(`TN:suite => t1${EOL}`));
	assert.isTrue(out.includes(`SF:src/a.ts${EOL}`));
	assert.isTrue(out.includes(`DA:1,3${EOL}`));
	assert.isTrue(out.includes(`DA:2,3${EOL}`));
	assert.isTrue(out.includes(`LF:2${EOL}`));
	assert.isTrue(out.includes(`LH:2${EOL}`));
	assert.isTrue(out.includes(`end_of_record`));
});

test('lcov convert - line outside any covered range reports DA hits of 0', () => {
	//	line 2 sits outside the covered range
	const fc = makeFileCov(
		'src/a.ts',
		[
			{ number: 1, beg: 0, end: 10 },
			{ number: 2, beg: 100, end: 110 }
		],
		[{ beg: 0, end: 10, hits: 5 }]
	);
	const out = lcovReporter.convert({
		testCoverages: [{ testId: 't', coverage: [fc] }],
		fileCoverages: []
	});

	assert.isTrue(out.includes(`DA:1,5${EOL}`));
	assert.isTrue(out.includes(`DA:2,0${EOL}`));
	assert.isTrue(out.includes(`LH:1${EOL}`));
	assert.isTrue(out.includes(`LF:2${EOL}`));
});

test('lcov convert - fileCoverages only (session mode) emits SF blocks, no TN', () => {
	const fc = makeFileCov(
		'src/b.ts',
		[{ number: 1, beg: 0, end: 5 }],
		[{ beg: 0, end: 5, hits: 1 }]
	);
	const out = lcovReporter.convert({
		testCoverages: [],
		fileCoverages: [fc]
	});

	assert.isFalse(out.includes('TN:'));
	assert.isTrue(out.includes(`SF:src/b.ts${EOL}`));
	assert.isTrue(out.includes(`DA:1,1${EOL}`));
	assert.isTrue(out.includes(`LF:1${EOL}`));
	assert.isTrue(out.includes(`LH:1${EOL}`));
});

test('lcov convert - multi-file test block emits one TN followed by multiple SF blocks', () => {
	const fcA = makeFileCov('src/a.ts', [{ number: 1, beg: 0, end: 5 }], [{ beg: 0, end: 5, hits: 1 }]);
	const fcB = makeFileCov('src/b.ts', [{ number: 1, beg: 0, end: 5 }], [{ beg: 0, end: 5, hits: 0 }]);

	const out = lcovReporter.convert({
		testCoverages: [{ testId: 't', coverage: [fcA, fcB] }],
		fileCoverages: []
	});

	//	exactly one TN emitted, both SFs emitted
	const tnCount = (out.match(/TN:/g) ?? []).length;
	const sfCount = (out.match(/SF:/g) ?? []).length;
	assert.strictEqual(tnCount, 1);
	assert.strictEqual(sfCount, 2);
});

test('lcov convert - fully unhit file reports LH:0', () => {
	const fc = makeFileCov(
		'src/a.ts',
		[{ number: 1, beg: 0, end: 5 }],
		[{ beg: 0, end: 5, hits: 0 }]
	);
	const out = lcovReporter.convert({
		testCoverages: [],
		fileCoverages: [fc]
	});
	assert.isTrue(out.includes(`DA:1,0${EOL}`));
	assert.isTrue(out.includes(`LH:0${EOL}`));
	assert.isTrue(out.includes(`LF:1${EOL}`));
});

test('lcov convert - multiple tests each emit their own TN block', () => {
	const fc = makeFileCov('src/a.ts', [{ number: 1, beg: 0, end: 5 }], [{ beg: 0, end: 5, hits: 1 }]);
	const out = lcovReporter.convert({
		testCoverages: [
			{ testId: 'suite => t1', coverage: [fc] },
			{ testId: 'suite => t2', coverage: [fc] }
		],
		fileCoverages: []
	});

	assert.isTrue(out.includes(`TN:suite => t1${EOL}`));
	assert.isTrue(out.includes(`TN:suite => t2${EOL}`));
});
