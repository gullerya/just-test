import { assert } from 'chai';
import { getSuite } from '@gullerya/just-test/suite';
import { waitInterval, waitNextTask } from '../../src/common/time-utils.js';

const suite = getSuite('Await utils');

suite.test('waitInterval', async () => {
	const startTime = performance.now();
	await waitInterval(75);
	const endTime = performance.now();
	assert.isTrue(endTime - startTime >= 75);
});

suite.test('waitNextTask', async () => {
	const ordered = [];
	setTimeout(() => ordered.push('b'), 0);
	ordered.push('a');
	await waitNextTask();
	ordered.push('c');
	assert.isTrue(ordered.indexOf('a') === 0);
	assert.isTrue(ordered.indexOf('b') === 1);
	assert.isTrue(ordered.indexOf('c') === 2);
});
