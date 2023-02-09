import { getSuite as getSuiteUT } from 'just-test/runner';

const
	suite = globalThis.getSuite('Suite APIs');

suite.test('suite - base API', test => {
	const sn = test.getRandom();
	const s = getSuiteUT(sn);

	test.assert.isObject(s);
	test.assert.isFunction(s.test);
});

suite.test('suite - invalid name', () => {
	getSuiteUT('');
}, {
	expectError: 'name MUST NOT be empty'
});
