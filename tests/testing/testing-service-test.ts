import { test } from '@gullerya/just-test';
import { assert } from '@gullerya/just-test/assert';
import {
	CONSTANTS,
	collectTestResources,
	verifyEnrichConfig,
	xUnitReporter
} from '../../src/testing/testing-service.ts';
import xUnitDirect from '../../src/testing/reporters/xunit-reporter.ts';

//	-----------------------------------------------------------------
//	CONSTANTS
//	-----------------------------------------------------------------

test('testing-service - CONSTANTS is frozen and exposes TESTS_METADATA', () => {
	assert.strictEqual(CONSTANTS.TESTS_METADATA, 'testsMetadata');
	assert.throws(() => { (CONSTANTS as any).TESTS_METADATA = 'other'; });
});

//	-----------------------------------------------------------------
//	xUnitReporter re-export
//	-----------------------------------------------------------------

test('testing-service - xUnitReporter re-export is the same instance as direct import', () => {
	assert.strictEqual(xUnitReporter, xUnitDirect);
});

//	-----------------------------------------------------------------
//	verifyEnrichConfig — delegates to configurer
//	-----------------------------------------------------------------

test('testing-service - verifyEnrichConfig delegates to configurer (fills defaults)', () => {
	const cfg = verifyEnrichConfig({ include: ['**/*.test.js'] }, {});
	assert.strictEqual(cfg.ttl, 60000);
	assert.strictEqual(cfg.maxFail, 0);
	assert.strictEqual(cfg.reports[0].format, 'xUnit');
});

test('testing-service - verifyEnrichConfig surfaces configurer validation errors', () => {
	assert.throws(
		() => verifyEnrichConfig({ include: [] }, {}),
		'"include" part of "tests" configuration MUST be a non-null nor-empty array'
	);
});

//	-----------------------------------------------------------------
//	collectTestResources — happy path
//	-----------------------------------------------------------------

test('collectTestResources - returns matching files for a glob that hits real tests', async () => {
	//	the repo ships many *-test.ts files under tests/common
	const result = await collectTestResources(['./tests/common/*-test.ts'], []);
	assert.isTrue(Array.isArray(result));
	assert.isTrue(result.length >= 1);
	//	every entry is a string path pointing to a *-test.ts file
	for (const entry of result) {
		assert.strictEqual(typeof entry, 'string');
		assert.isTrue(entry.endsWith('-test.ts'));
	}
});

test('collectTestResources - exclude filters out matching files', async () => {
	const all = await collectTestResources(['./tests/common/*-test.ts'], []);
	const filtered = await collectTestResources(
		['./tests/common/*-test.ts'],
		['**/assert-utils-test.ts']
	);
	assert.isTrue(filtered.length < all.length);
	assert.isTrue(filtered.every(p => !p.endsWith('assert-utils-test.ts')));
});

//	-----------------------------------------------------------------
//	collectTestResources — zero-match
//	-----------------------------------------------------------------

test('collectTestResources - zero matches throws with include+exclude in message', async () => {
	await assert.rejects(
		() => collectTestResources(['./tests/__no_such_dir__/**/*'], ['**/nope']),
		'no test files matched include='
	);
});

test('collectTestResources - zero-match error includes JSON-serialized include and exclude', async () => {
	try {
		await collectTestResources(['./tests/__no_such_dir__/*'], ['**/_excluded']);
		assert.fail('expected throw on zero matches');
	} catch (e: any) {
		assert.isTrue(e.message.includes('"./tests/__no_such_dir__/*"'));
		assert.isTrue(e.message.includes('"**/_excluded"'));
	}
});
