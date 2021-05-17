import { getSuite } from '/aut/bin/client/common/suite-runner.js';

const
	suite = globalThis.getSuite('Suite APIs');

suite.test('suite - base API', test => {
	const s = getSuite('suite-under-test');

	test.assert.isObject(s);
	test.assert.isFunction(s.test);
});

suite.test('suite - invalid name', () => {
	getSuite('');
}, {
	expectError: 'name MUST NOT be empty'
});
