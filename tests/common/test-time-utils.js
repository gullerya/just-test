import { test } from '@gullerya/just-test';
import { assert } from '../tests-chai-helper.js';
import { waitInterval, waitNextTask } from '../../src/common/time-utils.js';

test('waitInterval', async () => {
	const startTime = performance.now();
	await waitInterval(75);
	const endTime = performance.now();
	assert.isTrue(Math.round(endTime - startTime) >= 75);
});

test('waitNextTask', async () => {
	const ordered = [];
	setTimeout(() => ordered.push('b'), 0);
	ordered.push('a');
	await waitNextTask();
	ordered.push('c');
	assert.isTrue(ordered.indexOf('a') === 0);
	assert.isTrue(ordered.indexOf('b') === 1);
	assert.isTrue(ordered.indexOf('c') === 2);
});
