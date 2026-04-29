/**
 * Coverage URLs cross several boundaries (Playwright-reported V8 URLs,
 * Inspector-reported cwd-relative paths, glob output) and each boundary
 * has applied its own normalization historically. Matching coverage
 * entries against target sources therefore needs a single canonical form.
 *
 * canonical form: POSIX-style relative path, no leading "./", no query,
 * no hash, no trailing slash.
 *   "./dist/x.js"       -> "dist/x.js"
 *   "dist/x.js?v=1"     -> "dist/x.js"
 *   "dist/x.js#foo"     -> "dist/x.js"
 *   "./dist/./x.js"     -> "dist/x.js"
 *   "dist\\x.js"        -> "dist/x.js"  (Windows separators)
 */

export {
	normalizeCoverageUrl
};

function normalizeCoverageUrl(url) {
	if (typeof url !== 'string' || url.length === 0) {
		throw new TypeError(`url MUST be a non-empty string, got '${url}'`);
	}

	//	strip query and hash
	let result = url.split('?')[0].split('#')[0];

	//	normalize separators
	result = result.replace(/\\/g, '/');

	//	collapse "./" segments
	result = result.replace(/\/\.(?=\/)/g, '');

	//	strip a single leading "./"
	if (result.startsWith('./')) {
		result = result.slice(2);
	}

	//	strip trailing slash (but not if the whole string is "/")
	if (result.length > 1 && result.endsWith('/')) {
		result = result.slice(0, -1);
	}

	return result;
}
