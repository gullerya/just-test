import { runTest } from '/aut/bin/client/common/test-runner.js';

const suite = globalThis.getSuite('Test asset');

suite.test('test asset - ensure all present', async test => {
	let ta;
	runTest(_ta => {
		ta = _ta;
	});

	test.assert.isObject(ta);
	test.assert.isFunction(ta.assert);
	test.assert.isFunction(ta.expect);
	test.assert.isNumber(ta.assertions);
});
