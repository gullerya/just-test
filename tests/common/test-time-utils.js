import { assert } from '../../src/common/assert-utils.js';
import { test } from '../../src/runner/just-test.js';
import { waitInterval, waitNextTask } from '../../src/common/time-utils.js';

test('waitInterval', async () => {
	const startTime = performance.now();
	await waitInterval(75);
	const endTime = performance.now();
	assert.ok(Math.round(endTime - startTime) >= 75);
});

test('waitNextTask', async () => {
	const ordered = [];
	setTimeout(() => ordered.push('b'), 0);
	ordered.push('a');
	await waitNextTask();
	ordered.push('c');
	assert.ok(ordered.indexOf('a') === 0);
	assert.ok(ordered.indexOf('b') === 1);
	assert.ok(ordered.indexOf('c') === 2);
});
