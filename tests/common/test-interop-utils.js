import { test } from '@gullerya/just-test';
import { assert } from '@gullerya/just-test/assert';
import {
	TEST_ID_SEPARATOR,
	getTestId,
	parseTestId,
	getValidName
} from '../../src/common/interop-utils.js';

test('getTestId - 2 parts', () => {
	const tid = getTestId('some', 'thing');
	assert.strictEqual(`some${TEST_ID_SEPARATOR}thing`, tid);
});

test('getTestId - 3 parts', () => {
	const tid = getTestId('some', 'thing', 'more');
	assert.strictEqual(`some${TEST_ID_SEPARATOR}thing${TEST_ID_SEPARATOR}more`, tid);
});

test('parseTestId - 2 parts', () => {
	const base = getTestId('some', 'thing');
	const [p1, p2] = parseTestId(base);
	assert.strictEqual('some', p1);
	assert.strictEqual('thing', p2);
});

test('getValidName - negative (undefined)', () => {
	assert.throws(() => getValidName(), 'name MUST be a string');
});

test('getValidName - negative (null)', () => {
	assert.throws(() => getValidName(null), 'name MUST be a string');
});

test('getValidName - negative (number)', () => {
	assert.throws(() => getValidName(5), 'name MUST be a string');
});

test('getValidName - negative (empty string)', () => {
	assert.throws(() => getValidName(''), 'name MUST NOT be empty');
});

test('getValidName - negative (emptish string)', () => {
	assert.throws(() => getValidName('  \t '), 'name MUST NOT be empty');
});

test('getValidName - negative (invalide sequence within)', () => {
	assert.throws(() => getValidName(`Some${TEST_ID_SEPARATOR}thing`), 'name MUST NOT include');
});

test('getValidName', () => {
	const n = getValidName('  test ');
	assert.strictEqual('test', n);
});
