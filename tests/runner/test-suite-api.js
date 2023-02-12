import { assert } from 'chai';
import { getSuite } from 'just-test/runner';
import { getRandom } from 'just-test/random-utils';

const
	suite = getSuite('Suite APIs');

suite.test('suite - base API', test => {
	const sn = getRandom();
	const s = getSuite(sn);

	test.assert.isObject(s);
	test.assert.isFunction(s.test);
});

suite.test('suite - invalid name', () => {
	assert.throws(() => {
		getSuite('');
	}, `invalid suite name ''`);
});
