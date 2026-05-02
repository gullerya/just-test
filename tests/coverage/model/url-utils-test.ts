import { test } from '@gullerya/just-test';
import { assert } from '@gullerya/just-test/assert';
import { normalizeCoverageUrl } from '../../../src/coverage/model/url-utils.ts';

test('normalizeCoverageUrl - already canonical, unchanged', () => {
	assert.strictEqual(normalizeCoverageUrl('dist/x.js'), 'dist/x.js');
});

test('normalizeCoverageUrl - strips leading ./', () => {
	assert.strictEqual(normalizeCoverageUrl('./dist/x.js'), 'dist/x.js');
});

test('normalizeCoverageUrl - strips only a single leading ./', () => {
	//	two leading "./././" — only the first "./" is removed, the rest
	//	are folded by the "/./" collapse pass
	assert.strictEqual(normalizeCoverageUrl('././dist/x.js'), 'dist/x.js');
});

test('normalizeCoverageUrl - strips query', () => {
	assert.strictEqual(normalizeCoverageUrl('dist/x.js?v=1'), 'dist/x.js');
});

test('normalizeCoverageUrl - strips hash', () => {
	assert.strictEqual(normalizeCoverageUrl('dist/x.js#section'), 'dist/x.js');
});

test('normalizeCoverageUrl - strips both query and hash', () => {
	assert.strictEqual(normalizeCoverageUrl('dist/x.js?v=1#top'), 'dist/x.js');
});

test('normalizeCoverageUrl - collapses /./ segments', () => {
	assert.strictEqual(normalizeCoverageUrl('dist/./x.js'), 'dist/x.js');
});

test('normalizeCoverageUrl - leading ./ and inner /./ both handled', () => {
	assert.strictEqual(normalizeCoverageUrl('./dist/./sub/./x.js'), 'dist/sub/x.js');
});

test('normalizeCoverageUrl - converts Windows backslashes to forward slashes', () => {
	assert.strictEqual(normalizeCoverageUrl('dist\\sub\\x.js'), 'dist/sub/x.js');
});

test('normalizeCoverageUrl - strips trailing slash', () => {
	assert.strictEqual(normalizeCoverageUrl('dist/sub/'), 'dist/sub');
});

test('normalizeCoverageUrl - preserves lone "/" root', () => {
	assert.strictEqual(normalizeCoverageUrl('/'), '/');
});

test('normalizeCoverageUrl - absolute POSIX path passes through (no leading-./ to strip)', () => {
	assert.strictEqual(normalizeCoverageUrl('/abs/path/x.js'), '/abs/path/x.js');
});

test('normalizeCoverageUrl - http URL keeps scheme host and strips query', () => {
	assert.strictEqual(
		normalizeCoverageUrl('http://host/static/x.js?t=1'),
		'http://host/static/x.js'
	);
});

test('normalizeCoverageUrl - is idempotent', () => {
	const raw = './dist\\sub/./x.js?v=1#frag';
	const once = normalizeCoverageUrl(raw);
	const twice = normalizeCoverageUrl(once);
	assert.strictEqual(once, twice);
	assert.strictEqual(once, 'dist/sub/x.js');
});

test('normalizeCoverageUrl - negative (empty string)', () => {
	assert.throws(() => normalizeCoverageUrl(''), 'url MUST be a non-empty string');
});

test('normalizeCoverageUrl - negative (null)', () => {
	assert.throws(() => normalizeCoverageUrl(null), 'url MUST be a non-empty string');
});

test('normalizeCoverageUrl - negative (undefined)', () => {
	assert.throws(() => normalizeCoverageUrl(undefined), 'url MUST be a non-empty string');
});

test('normalizeCoverageUrl - negative (number)', () => {
	assert.throws(() => normalizeCoverageUrl(42), 'url MUST be a non-empty string');
});

test('normalizeCoverageUrl - negative (object)', () => {
	assert.throws(() => normalizeCoverageUrl({} as unknown as string), 'url MUST be a non-empty string');
});

test('normalizeCoverageUrl - negative throws TypeError, not Error', () => {
	try {
		normalizeCoverageUrl('');
		assert.fail('expected to throw');
	} catch (e) {
		assert.isTrue(e instanceof TypeError);
	}
});
