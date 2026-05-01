import { test } from '@gullerya/just-test';
import { assert } from '@gullerya/just-test/assert';
import buildConfig from '../../src/testing/testing-configurer.ts';

const VALID_MINIMAL = Object.freeze({
	include: ['**/*.test.js']
});

//	-----------------------------------------------------------------
//	Defaults & key filtering
//	-----------------------------------------------------------------

test('testing-configurer - returns DEFAULT_CONFIG fields when user gives only include', () => {
	const cfg = buildConfig(VALID_MINIMAL);

	assert.strictEqual(cfg.ttl, 60000);
	assert.strictEqual(cfg.maxFail, 0);
	assert.strictEqual(cfg.maxSkip, 0);
	assert.deepStrictEqual(cfg.include, ['**/*.test.js']);
	assert.deepStrictEqual(cfg.exclude, []);
	assert.strictEqual(cfg.reports.length, 1);
	assert.strictEqual(cfg.reports[0].format, 'xUnit');
});

test('testing-configurer - unknown user keys are filtered out', () => {
	const cfg: any = buildConfig({
		include: ['a'],
		unknown: 'value',
		anotherRandom: 123
	});
	assert.strictEqual('unknown' in cfg, false);
	assert.strictEqual('anotherRandom' in cfg, false);
});

test('testing-configurer - user values override defaults for every known key', () => {
	const cfg = buildConfig({
		ttl: 5000,
		maxFail: 3,
		maxSkip: 2,
		include: ['tests/**'],
		exclude: ['tests/broken/**'],
		reports: [{ format: 'xUnit' }]
	});

	assert.strictEqual(cfg.ttl, 5000);
	assert.strictEqual(cfg.maxFail, 3);
	assert.strictEqual(cfg.maxSkip, 2);
	assert.deepStrictEqual(cfg.include, ['tests/**']);
	assert.deepStrictEqual(cfg.exclude, ['tests/broken/**']);
	assert.strictEqual(cfg.reports.length, 1);
	assert.strictEqual(cfg.reports[0].format, 'xUnit');
});

test('testing-configurer - result is frozen', () => {
	const cfg = buildConfig(VALID_MINIMAL);
	assert.throws(() => { (cfg as any).ttl = 1; });
});

//	-----------------------------------------------------------------
//	validate — reports
//	-----------------------------------------------------------------

test('testing-configurer - reports not an array -> throws', () => {
	assert.throws(
		() => buildConfig({ include: ['a'], reports: 'bogus' as any }),
		'test reporters MUST be an array of non-null objects'
	);
});

test('testing-configurer - reports with null element -> throws', () => {
	assert.throws(
		() => buildConfig({ include: ['a'], reports: [null] as any }),
		'test reporters MUST be an array of non-null objects'
	);
});

test('testing-configurer - report with unsupported format -> throws', () => {
	assert.throws(
		() => buildConfig({ include: ['a'], reports: [{ format: 'tap' }] as any }),
		'reporter type MUST be a one of xUnit'
	);
});

//	-----------------------------------------------------------------
//	validate — include / exclude
//	-----------------------------------------------------------------

test('testing-configurer - include not an array -> throws', () => {
	assert.throws(
		() => buildConfig({ include: 'a-single-string' } as any),
		'"include" part of "tests" configuration MUST be a non-null nor-empty array'
	);
});

test('testing-configurer - include empty array -> throws', () => {
	assert.throws(
		() => buildConfig({ include: [] } as any),
		'"include" part of "tests" configuration MUST be a non-null nor-empty array'
	);
});

test('testing-configurer - exclude not an array -> throws', () => {
	assert.throws(
		() => buildConfig({ include: ['a'], exclude: 'single-string' as any }),
		'"exclude" part of "tests" configuration MUST be a non-null array'
	);
});

test('testing-configurer - exclude empty array is allowed', () => {
	const cfg = buildConfig({ include: ['a'], exclude: [] });
	assert.deepStrictEqual(cfg.exclude, []);
});

//	-----------------------------------------------------------------
//	_reduceIdenticalReports — duplicate collapse by format
//	-----------------------------------------------------------------

test('testing-configurer - duplicate reports (same format) are collapsed to one', () => {
	const cfg = buildConfig({
		include: ['a'],
		reports: [
			{ format: 'xUnit' },
			{ format: 'xUnit' }
		]
	});
	assert.strictEqual(cfg.reports.length, 1);
	assert.strictEqual(cfg.reports[0].format, 'xUnit');
});
