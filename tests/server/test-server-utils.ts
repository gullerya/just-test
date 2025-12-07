import { test } from '../../src/runner/just-test.js';
import { assert } from '../../src/common/assert-utils.ts';
import {
	EXT_TO_MIME_MAP, findMimeType
} from '../../src/server/server-utils.ts';

test('extension map is full', () => {
	assert.strictEqual(EXT_TO_MIME_MAP.css, 'text/css');
	assert.strictEqual(EXT_TO_MIME_MAP.html, 'text/html');
	assert.strictEqual(EXT_TO_MIME_MAP.htm, 'text/html');
	assert.strictEqual(EXT_TO_MIME_MAP.js, 'text/javascript');
	assert.strictEqual(EXT_TO_MIME_MAP.mjs, 'text/javascript');
	assert.strictEqual(EXT_TO_MIME_MAP.json, 'application/json');
	assert.strictEqual(EXT_TO_MIME_MAP.txt, 'text/plain');
	assert.strictEqual(EXT_TO_MIME_MAP.xml, 'application/xml');
});

test('extension map is immutable', () => {
	assert.throws(
		() => { EXT_TO_MIME_MAP.js = 'something else'; }
	);
});

test('finding mime type', () => {
	const mime = findMimeType('some/path/to.file.with.js');
	assert.strictEqual(mime, 'text/javascript');
});

test('OOTB default mime type', () => {
	assert.throws(() => findMimeType('some/path/to.file.with.some'));
});

test('provided default mime type - unknown extension', () => {
	assert.throws(() => findMimeType('some/path/to.file.with.some', 'text/plain'));
});

test('provided default mime type - no extension', () => {
	const mime = findMimeType('some/path/to-file-with-some', 'text/plain');
	assert.strictEqual(mime, 'text/plain');
});

test('file path is ending with dot - fallbacks to default', () => {
	assert.throws(() => findMimeType('some/path/to-file-with-some.'));
});