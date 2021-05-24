import {
	waitInterval,
	waitNextTask
} from '/aut/bin/common/await-utils.js';

const suite = globalThis.getSuite('Await utils');

suite.test('waitInterval', async test => {
	const startTime = performance.now();
	await waitInterval(75);
	const endTime = performance.now();
	test.assert.isTrue(endTime - startTime >= 75);
});

suite.test('waitNextTask', async test => {
	const ordered = [];
	setTimeout(() => ordered.push('b'), 0);
	ordered.push('a');
	await waitNextTask();
	ordered.push('c');
	test.assert.isTrue(ordered.indexOf('a') === 0);
	test.assert.isTrue(ordered.indexOf('b') === 1);
	test.assert.isTrue(ordered.indexOf('c') === 2);
});