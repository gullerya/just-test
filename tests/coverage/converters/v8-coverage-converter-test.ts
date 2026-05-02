import { test } from '@gullerya/just-test';
import { assert } from '@gullerya/just-test/assert';
import { v8toJustTest } from '../../../src/coverage/converters/v8-coverage-converter.ts';

const SOURCE = 'line 1\nline 2\nline 3';
const stubFetcher = () => Promise.resolve(SOURCE);

test('v8toJustTest - negative (not an array)', async () => {
	await assert.rejects(
		async () => await v8toJustTest(null as any, stubFetcher),
		'expected to get an array of V8 coverage objects'
	);
});

test('v8toJustTest - negative (undefined)', async () => {
	await assert.rejects(
		async () => await v8toJustTest(undefined as any, stubFetcher),
		'expected to get an array of V8 coverage objects'
	);
});

test('v8toJustTest - negative (plain object)', async () => {
	await assert.rejects(
		async () => await v8toJustTest({} as any, stubFetcher),
		'expected to get an array of V8 coverage objects'
	);
});

test('v8toJustTest - negative (entry missing url)', async () => {
	await assert.rejects(
		async () => await v8toJustTest([{ functions: [] } as any], stubFetcher),
		'invalid V8 coverage object'
	);
});

test('v8toJustTest - negative (entry url is not a string)', async () => {
	await assert.rejects(
		async () => await v8toJustTest([{ url: 123, functions: [] } as any], stubFetcher),
		'invalid V8 coverage object'
	);
});

test('v8toJustTest - negative (entry missing functions)', async () => {
	await assert.rejects(
		async () => await v8toJustTest([{ url: 'x.js' } as any], stubFetcher),
		'invalid V8 coverage object'
	);
});

test('v8toJustTest - negative (entry functions not an array)', async () => {
	await assert.rejects(
		async () => await v8toJustTest([{ url: 'x.js', functions: {} } as any], stubFetcher),
		'invalid V8 coverage object'
	);
});

test('v8toJustTest - negative (null entry)', async () => {
	await assert.rejects(
		async () => await v8toJustTest([null as any], stubFetcher),
		'invalid V8 coverage object'
	);
});

test('v8toJustTest - empty array returns empty array', async () => {
	const result = await v8toJustTest([], stubFetcher);
	assert.deepStrictEqual(result, []);
});

test('v8toJustTest - single file, single function, single range', async () => {
	const result = await v8toJustTest([{
		url: 'x.js',
		functions: [
			{ functionName: 'f', ranges: [{ startOffset: 0, endOffset: SOURCE.length, count: 2 }] }
		]
	}], stubFetcher);

	assert.strictEqual(result.length, 1);
	const f = result[0];
	assert.strictEqual(f.url, 'x.js');
	//	every covered line (3) is extracted from the source
	assert.strictEqual(f.lines.length, 3);
	//	the V8 range contributed to coverage — at least one range reports hits > 0
	assert.isTrue(f.ranges.some(r => r.hits > 0));
});

test('v8toJustTest - multiple files preserved in order', async () => {
	const result = await v8toJustTest([
		{ url: 'a.js', functions: [] },
		{ url: 'b.js', functions: [] }
	], stubFetcher);

	assert.strictEqual(result.length, 2);
	assert.strictEqual(result[0].url, 'a.js');
	assert.strictEqual(result[1].url, 'b.js');
});

test('v8toJustTest - function with empty ranges leaves file coverage intact', async () => {
	const result = await v8toJustTest([{
		url: 'x.js',
		functions: [{ functionName: 'f', ranges: [] }]
	}], stubFetcher);

	assert.strictEqual(result.length, 1);
	assert.strictEqual(result[0].url, 'x.js');
});
