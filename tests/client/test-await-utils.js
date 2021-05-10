import {
	waitMillis,
	waitNextTask
} from '/aut/bin/client/common/await-utils.js';

const suite = globalThis.getSuite('Await utils');

suite.test('waitMillis', async test => {
	const startTime = performance.now();
	await waitMillis(75);
	const endTime = performance.now();
	test.assertTrue(endTime - startTime > 75);
});

suite.test('waitNextTask', async test => {
	const startTime = performance.now();
	await waitNextTask();
	const endTime = performance.now();
	test.assertTrue(endTime - startTime > 1);
});