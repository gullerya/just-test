//	Worker-mode smoke test.
//
//	This file demonstrates the import style required for tests that need to
//	run under the browser `worker` executor. Web Workers (`new Worker(url,
//	{ type: 'module' })`) do not inherit the host document's importmap, so
//	bare specifiers like `@gullerya/just-test` fail to resolve inside the
//	worker test-box. The relative path through `node_modules/` is resolved
//	as a file by Node and served by the `/static/` handler to browsers, so
//	the same string works in every environment.
//
//	All other tests in this repo use bare imports (the preferred style).
//	See `docs/architecture.md` §6.1 for the full rationale.

import { test } from '../../node_modules/@gullerya/just-test/bin/runner/just-test.js';
import { assert } from '../../node_modules/@gullerya/just-test/bin/common/assert-utils.js';

test('worker sandbox is alive - sync', () => {
	assert.strictEqual(typeof self, 'object');
	assert.strictEqual(typeof globalThis.document, 'undefined');
});

test('worker sandbox is alive - async', async () => {
	const v = await Promise.resolve(42);
	assert.strictEqual(v, 42);
});
