import { test } from '../../src/runner/just-test.js';
import { assert } from '../../src/common/assert-utils.ts';
import { collectTargetSources } from '../../src/coverage/coverage-service.js';

test('collect sources - empty or null input', async () => {
	let ts = await collectTargetSources();
	assert.deepStrictEqual(ts, []);

	ts = await collectTargetSources({});
	assert.deepStrictEqual(ts, []);
});

test('collect sources - only include', async () => {
	let ts = await collectTargetSources({
		include: '**/test-coverage-service.ts'
	});

	assert.deepStrictEqual(ts, ['tests/coverage/test-coverage-service.ts']);
});

test('collect sources - include and exclude', async () => {
	let ts = await collectTargetSources({
		include: '**/test-coverage-service.ts',
		exclude: '**/*-service.ts'
	});

	assert.deepStrictEqual(ts, []);
});