import {
	TEST_ID_SEPARATOR,
	getTestId,
	parseTestId,
	getValidName
} from '/aut/bin/common/interop-utils.js';

const suite = globalThis.getSuite('Interop utils');

suite.test('getTestId - 2 parts', test => {
	const tid = getTestId('some', 'thing');
	test.assert.strictEqual(`some${TEST_ID_SEPARATOR}thing`, tid);
});

suite.test('getTestId - 3 parts', test => {
	const tid = getTestId('some', 'thing', 'more');
	test.assert.strictEqual(`some${TEST_ID_SEPARATOR}thing${TEST_ID_SEPARATOR}more`, tid);
});

suite.test('parseTestId - 2 parts', test => {
	const base = getTestId('some', 'thing');
	const [p1, p2] = parseTestId(base);
	test.assert.strictEqual('some', p1);
	test.assert.strictEqual('thing', p2);
});

suite.test('getValidName - negative (undefined)', () => {
	getValidName();
}, {
	expectError: 'name MUST be a string'
});

suite.test('getValidName - negative (null)', () => {
	getValidName(null);
}, {
	expectError: 'name MUST be a string'
});

suite.test('getValidName - negative (number)', () => {
	getValidName(5);
}, {
	expectError: 'name MUST be a string'
});

suite.test('getValidName - negative (empty string)', () => {
	getValidName('');
}, {
	expectError: 'name MUST NOT be empty'
});

suite.test('getValidName - negative (emptish string)', () => {
	getValidName('  \t ');
}, {
	expectError: 'name MUST NOT be empty'
});

suite.test('getValidName - negative (invalide sequence within)', () => {
	getValidName(`Some${TEST_ID_SEPARATOR}thing`);
}, {
	expectError: 'name MUST NOT include'
});

suite.test('getValidName', test => {
	const n = getValidName('  test ');
	test.assert.strictEqual('test', n);
});
