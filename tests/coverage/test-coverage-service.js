import { test } from '@gullerya/just-test';
import { assert } from '@gullerya/just-test/assert';
import { collectTargetSources } from '../../src/coverage/coverage-service.js';

test('collect sources - empty or null input', async () => {
	let ts = await collectTargetSources();
	assert.deepStrictEqual(ts, []);

	ts = await collectTargetSources({});
	assert.deepStrictEqual(ts, []);
});

test('collect sources - only include', async () => {
	let ts = await collectTargetSources({
		include: '**/test-coverage-service.js'
	});

	assert.deepStrictEqual(ts, ['tests/coverage/test-coverage-service.js']);
});

test('collect sources - include and exclude', async () => {
	let ts = await collectTargetSources({
		include: '**/test-coverage-service.js',
		exclude: '**/*-service.js'
	});

	assert.deepStrictEqual(ts, []);
});