import { test } from '@gullerya/just-test';
import { assert } from '@gullerya/just-test/assert';
import configure from '../../../src/server/environments/environments-configurer.ts';

//	-----------------------------------------------------------------
//	top-level validation
//	-----------------------------------------------------------------

test('configurer - rejects foreign entries on environment definition', () => {
	assert.throws(() => configure({ interactive: true, what: 'ever' } as any));
});

test('configurer - rejects missing principal (none of interactive/browser/node)', () => {
	assert.throws(() => configure({} as any));
});

test('configurer - rejects multiple principals set simultaneously', () => {
	assert.throws(() => configure({ interactive: true, node: true } as any));
	assert.throws(() => configure({ interactive: true, browser: { type: 'chromium' } } as any));
});

//	-----------------------------------------------------------------
//	interactive / node branches
//	-----------------------------------------------------------------

test('configurer - interactive must be boolean', () => {
	assert.throws(() => configure({ interactive: 'yes' } as any));
});

test('configurer - node must be boolean', () => {
	assert.throws(() => configure({ node: 1 } as any));
});

test('configurer - interactive=true produces result.interactive=true', () => {
	const out: any = configure({ interactive: true } as any);
	assert.strictEqual(out.interactive, true);
});

test('configurer - node=true produces result.node=true', () => {
	const out: any = configure({ node: true } as any);
	assert.strictEqual(out.node, true);
});

//	-----------------------------------------------------------------
//	browser branch
//	-----------------------------------------------------------------

test('configurer - browser without a supported type is rejected', () => {
	assert.throws(() => configure({ browser: { type: 'opera' } } as any));
});

test('configurer - browser defaults executor to iframe when absent', () => {
	const out: any = configure({ browser: { type: 'chromium' } } as any);
	assert.strictEqual(out.browser.executors.type, 'iframe');
});

test('configurer - browser rejects non-object executors', () => {
	assert.throws(() => configure({ browser: { type: 'chromium', executors: 'iframe' } } as any));
});

test('configurer - browser rejects unsupported executor type', () => {
	assert.throws(() => configure({ browser: { type: 'chromium', executors: { type: 'thread' } } } as any));
});

test('configurer - browser accepts all supported browser+executor combos', () => {
	for (const type of ['chromium', 'firefox', 'webkit']) {
		for (const execType of ['iframe', 'page', 'worker']) {
			const out: any = configure({ browser: { type, executors: { type: execType } } } as any);
			assert.strictEqual(out.browser.type, type);
			assert.strictEqual(out.browser.executors.type, execType);
		}
	}
});

test('configurer - browser scheme validated against supported set', () => {
	assert.throws(() => configure({ browser: { type: 'chromium', scheme: 'sepia' } } as any));
	const out: any = configure({ browser: { type: 'chromium', scheme: 'dark' } } as any);
	assert.strictEqual(out.browser.scheme, 'dark');
});

test('configurer - importmap must be an object with imports object', () => {
	assert.throws(() => configure({ browser: { type: 'chromium', importmap: 'x' } } as any));
	assert.throws(() => configure({ browser: { type: 'chromium', importmap: { imports: 'x' } } } as any));
});

test('configurer - importmap defaults are injected when absent', () => {
	const out: any = configure({ browser: { type: 'chromium' } } as any);
	assert.isTrue(typeof out.browser.importmap === 'object');
	assert.strictEqual(out.browser.importmap.imports['@gullerya/just-test'], '/libs/@gullerya/just-test/bin/runner/just-test.js');
	assert.strictEqual(out.browser.importmap.imports['@gullerya/just-test/assert'], '/libs/@gullerya/just-test/bin/common/assert-utils.js');
});

test('configurer - user importmap entries merge with and override nothing on defaults key conflict', () => {
	//	Object.assign({}, DEFAULTS, user) — user wins on conflict
	const out: any = configure({
		browser: {
			type: 'chromium',
			importmap: {
				imports: {
					'custom-lib': '/vendor/custom-lib.js',
					'@gullerya/just-test': '/override/just-test.js'
				}
			}
		}
	} as any);
	assert.strictEqual(out.browser.importmap.imports['custom-lib'], '/vendor/custom-lib.js');
	assert.strictEqual(out.browser.importmap.imports['@gullerya/just-test'], '/override/just-test.js');
	//	non-conflicting defaults preserved
	assert.strictEqual(out.browser.importmap.imports['@gullerya/just-test/random'], '/libs/@gullerya/just-test/bin/common/random-utils.js');
});
