import { runTest } from '/aut/bin/runner/environments/test-runner.js';

const suite = globalThis.getSuite('Test asset');

suite.test('test asset - ensure all present', async test => {
	let ta;
	await runTest(_ta => {
		ta = _ta;
	});

	test.assert.isObject(ta);
	test.assert.isFunction(ta.assert);
	test.assert.isFunction(ta.expect);
	test.assert.isFunction(ta.waitInterval);
	test.assert.isFunction(ta.waitNextTask);
});
