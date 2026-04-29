import { test } from '../../src/runner/just-test.ts';
import { assert } from '../../src/common/assert-utils.ts';
import { collectTargetSources } from '../../src/coverage/coverage-service.ts';

test('collect sources - empty or null input', async () => {
	let ts = await collectTargetSources();
	assert.deepStrictEqual(ts, []);

	ts = await collectTargetSources({});
	assert.deepStrictEqual(ts, []);
});

test('collect sources - only include', async () => {
	let ts = await collectTargetSources({
		include: '**/coverage-service-test.ts'
	});

	assert.deepStrictEqual(ts, ['tests/coverage/coverage-service-test.ts']);
});

test('collect sources - include and exclude', async () => {
	let ts = await collectTargetSources({
		include: '**/coverage-service-test.ts',
		exclude: '**/*-test.ts'
	});

	assert.deepStrictEqual(ts, []);
});