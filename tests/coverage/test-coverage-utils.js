import { test } from '@gullerya/just-test';
import { assert } from '../tests-chai-helper.js';
import { buildJTFileCov } from '../../src/coverage/model/model-utils.js';

test('build model - negative (bad source URL, not a string)', async () => {
	await assert.rejects(
		buildJTFileCov(5),
		'source URL MUST be a non-empty string'
	);
});

test('build model - negative (bad source URL, empty string)', async () => {
	await assert.rejects(
		buildJTFileCov(''),
		'source URL MUST be a non-empty string'
	);
});

test('build model - negative (bad everImported, not a boolean)', async () => {
	await assert.rejects(
		buildJTFileCov('url', 6),
		'even imported MUST be a boolean'
	);
});

test('build model - negative (bad sourceFetcher, not a function)', async () => {
	await assert.rejects(
		buildJTFileCov('url', false, 'string'),
		'source fetcher MUST be a function'
	);
});

test('build model - Windows line separator', async () => {
	const fileCov = await buildJTFileCov('url', true, () => Promise.resolve(`line 1\r\nline 2\r\n\r\nline 4`));
	assert.deepStrictEqual(fileCov, {
		url: 'url',
		lines: [
			{ beg: 0, end: 6, number: 1 },
			{ beg: 8, end: 14, number: 2 },
			{ beg: 18, end: 24, number: 4 }
		],
		ranges: [{ beg: 0, end: 24, hits: 1 }],
		functions: []
	});
});

test('build model - Unix line separator', async () => {
	const fileCov = await buildJTFileCov('url', false, () => Promise.resolve(`line 1\nline 2\n\nline 4`));
	assert.deepStrictEqual(fileCov, {
		url: 'url',
		lines: [
			{ beg: 0, end: 6, number: 1 },
			{ beg: 7, end: 13, number: 2 },
			{ beg: 15, end: 21, number: 4 }
		],
		ranges: [{ beg: 0, end: 21, hits: 0 }],
		functions: []
	});
});

test('build model - remark, single line', async () => {
	const fileCov = await buildJTFileCov('url', true, () => Promise.resolve(`
		line 2
		line 3

			//	some remark
		line 6
	`));
	assert.deepStrictEqual(fileCov, {
		url: 'url',
		lines: [
			{ beg: 1, end: 9, number: 2 },
			{ beg: 10, end: 18, number: 3 },
			{ beg: 38, end: 46, number: 6 }
		],
		ranges: [{ beg: 0, end: 48, hits: 1 }],
		functions: []
	});
});

test('build model - remark, multi line', async () => {
	const fileCov = await buildJTFileCov('url', true, () => Promise.resolve(`
		/* rem
		   rem
		*/
		line 5
	`));
	assert.deepStrictEqual(fileCov, {
		url: 'url',
		lines: [
			{ beg: 24, end: 32, number: 5 }
		],
		ranges: [{ beg: 0, end: 34, hits: 1 }],
		functions: []
	});
});

test('build model - remark, multi line (all in)', async () => {
	const fileCov = await buildJTFileCov('url', false, () => Promise.resolve(`
		line 2 /* rem */
		line 3
	`));
	assert.deepStrictEqual(fileCov, {
		url: 'url',
		lines: [
			{ beg: 1, end: 19, number: 2 },
			{ beg: 20, end: 28, number: 3 }
		],
		ranges: [{ beg: 0, end: 30, hits: 0 }],
		functions: []
	});
});

test('build model - remark, multi line (spit around)', async () => {
	const fileCov = await buildJTFileCov('url', false, () => Promise.resolve(`
		line 2 /* start remark here...
		... end remark here */ line 3
		line 4
	`));
	assert.deepStrictEqual(fileCov, {
		url: 'url',
		lines: [
			{ beg: 1, end: 33, number: 2 },
			{ beg: 34, end: 65, number: 3 },
			{ beg: 66, end: 74, number: 4 }
		],
		ranges: [{ beg: 0, end: 76, hits: 0 }],
		functions: []
	});
});