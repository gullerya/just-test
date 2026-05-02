import { test } from '@gullerya/just-test';
import { assert } from '@gullerya/just-test/assert';
import { filterV8Coverage } from '../../../src/coverage/model/v8-coverage-filter.ts';

test('filterV8Coverage - negative (v8Entries not an array)', () => {
	assert.throws(
		() => filterV8Coverage(null as any, ['./src/**/*']),
		'MUST be an array'
	);
});

test('filterV8Coverage - negative (includePatterns not an array)', () => {
	assert.throws(
		() => filterV8Coverage([], null as any),
		'MUST be an array'
	);
});

test('filterV8Coverage - empty include patterns returns empty array', () => {
	const entries = [{ url: 'src/a.ts', functions: [] }];
	assert.deepStrictEqual(filterV8Coverage(entries, []), []);
});

test('filterV8Coverage - empty entries returns empty array', () => {
	assert.deepStrictEqual(filterV8Coverage([], ['./src/**/*']), []);
});

test('filterV8Coverage - matches glob against canonical url', () => {
	const entries = [
		{ url: 'src/common/assert-utils.ts', functions: [] },
		{ url: 'node_modules/foo.js', functions: [] }
	];
	const result = filterV8Coverage(entries, ['./src/**/*']);
	assert.strictEqual(result.length, 1);
	assert.strictEqual(result[0].url, 'src/common/assert-utils.ts');
});

test('filterV8Coverage - leading ./ on url is normalized', () => {
	const entries = [{ url: './src/a.ts', functions: [] }];
	const result = filterV8Coverage(entries, ['src/**/*']);
	assert.strictEqual(result.length, 1);
});

test('filterV8Coverage - leading ./ on pattern is normalized', () => {
	const entries = [{ url: 'src/a.ts', functions: [] }];
	const result = filterV8Coverage(entries, ['./src/**/*']);
	assert.strictEqual(result.length, 1);
});

test('filterV8Coverage - multiple patterns OR-combined', () => {
	const entries = [
		{ url: 'src/a.ts', functions: [] },
		{ url: 'lib/b.ts', functions: [] },
		{ url: 'test/c.ts', functions: [] }
	];
	const result = filterV8Coverage(entries, ['./src/**/*', './lib/**/*']);
	assert.strictEqual(result.length, 2);
	assert.strictEqual(result[0].url, 'src/a.ts');
	assert.strictEqual(result[1].url, 'lib/b.ts');
});

test('filterV8Coverage - drops entries with empty/missing url', () => {
	const entries = [
		{ url: '', functions: [] },
		{ url: 'src/a.ts', functions: [] },
		{ functions: [] } as any,
		null as any
	];
	const result = filterV8Coverage(entries, ['./src/**/*']);
	assert.strictEqual(result.length, 1);
	assert.strictEqual(result[0].url, 'src/a.ts');
});

test('filterV8Coverage - preserves functions payload unchanged', () => {
	const fns = [{ functionName: 'f', ranges: [{ startOffset: 0, endOffset: 5, count: 1 }] }];
	const entries = [{ url: 'src/a.ts', functions: fns }];
	const result = filterV8Coverage(entries, ['./src/**/*']);
	assert.strictEqual(result[0].functions, fns);
});

test('filterV8Coverage - no match returns empty array', () => {
	const entries = [{ url: 'other/a.ts', functions: [] }];
	const result = filterV8Coverage(entries, ['./src/**/*']);
	assert.deepStrictEqual(result, []);
});
