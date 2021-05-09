import {
	getTestId,
	parseTestId,
	getValidName
} from '/aut/bin/client/common/interop-utils.js';

const suite = globalThis.getSuite('Common utils');

suite.test('getTestId - 2 parts', test => {
	const tid = getTestId('some', 'thing');
	test.assertEqual('some-|-thing', tid);
});

suite.test('getTestId - 3 parts', test => {
	const tid = getTestId('some', 'thing', 'more');
	test.assertEqual('some-|-thing-|-more', tid);
});

suite.test('parseTestId - 2 parts', test => {
	const base = getTestId('some', 'thing');
	const [p1, p2] = parseTestId(base);
	test.assertEqual('someq', p1);
	test.assertEqual('thing', p2);
});
