import {
	waitInterval,
	waitNextTask
} from '/aut/bin/client/common/await-utils.js';

const suite = globalThis.getSuite('Await utils');

suite.test('waitInterval', async test => {
	const startTime = performance.now();
	await waitInterval(75);
	const endTime = performance.now();
	test.assert.isTrue(endTime - startTime > 75);
});

suite.test('waitNextTask', async test => {
	const startTime = performance.now();
	await waitNextTask();
	const endTime = performance.now();
	test.assert.isTrue(endTime - startTime > 1);
});