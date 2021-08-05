import {
	extensionsMap, findMimeType
} from '../../bin/server/server-utils.js';

const suite = globalThis.getSuite('Server utils');

suite.test('extension map is full', test => {
	test.assert.strictEqual(extensionsMap.css, 'text/css');
	test.assert.strictEqual(extensionsMap.html, 'text/html');
	test.assert.strictEqual(extensionsMap.htm, 'text/html');
	test.assert.strictEqual(extensionsMap.js, 'text/javascript');
	test.assert.strictEqual(extensionsMap.mjs, 'text/javascript');
	test.assert.strictEqual(extensionsMap.json, 'application/json');
	test.assert.strictEqual(extensionsMap.txt, 'text/plain');
	test.assert.strictEqual(extensionsMap.xml, 'application/xml');
});

suite.test('extension map is immutable', test => {
	extensionsMap.js = 'something else';
	test.assert.strictEqual(extensionsMap.js, 'text/javascript');
});

suite.test('finding mime type', test => {
	const mime = findMimeType('some/path/to.file.with.js');
	test.assert.strictEqual(mime, 'text/javascript');
});

suite.test('OOTB default mime type', test => {
	const mime = findMimeType('some/path/to.file.with.some');
	test.assert.strictEqual(mime, 'text/plain');
});

suite.test('provided default mime type', test => {
	const mime = findMimeType('some/path/to.file.with.some', 'text/plain');
	test.assert.strictEqual(mime, 'text/plain');
});