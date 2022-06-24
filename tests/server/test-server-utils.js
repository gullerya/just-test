import { assert } from 'chai';
import { getSuite } from '@gullerya/just-test/suite';
import {
	extensionsMap, findMimeType
} from '../../src/server/server-utils.js';

const suite = getSuite('Server utils');

suite.test('extension map is full', () => {
	assert.strictEqual(extensionsMap.css, 'text/css');
	assert.strictEqual(extensionsMap.html, 'text/html');
	assert.strictEqual(extensionsMap.htm, 'text/html');
	assert.strictEqual(extensionsMap.js, 'text/javascript');
	assert.strictEqual(extensionsMap.mjs, 'text/javascript');
	assert.strictEqual(extensionsMap.json, 'application/json');
	assert.strictEqual(extensionsMap.txt, 'text/plain');
	assert.strictEqual(extensionsMap.xml, 'application/xml');
});

suite.test('extension map is immutable', () => {
	assert.throws(
		() => { extensionsMap.js = 'something else'; },
		'Cannot assign to read only property'
	);
});

suite.test('finding mime type', () => {
	const mime = findMimeType('some/path/to.file.with.js');
	assert.strictEqual(mime, 'text/javascript');
});

suite.test('OOTB default mime type', () => {
	const mime = findMimeType('some/path/to.file.with.some');
	assert.strictEqual(mime, 'text/plain');
});

suite.test('provided default mime type - unknown extension', () => {
	const mime = findMimeType('some/path/to.file.with.some', 'text/plain');
	assert.strictEqual(mime, 'text/plain');
});

suite.test('provided default mime type - no extension', () => {
	const mime = findMimeType('some/path/to-file-with-some', 'text/plain');
	assert.strictEqual(mime, 'text/plain');
});