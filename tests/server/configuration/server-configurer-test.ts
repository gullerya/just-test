import { test } from '@gullerya/just-test';
import { assert } from '@gullerya/just-test/assert';
import configure from '../../../src/server/configuration/server-configurer.ts';
import DEFAULT_CONFIG from '../../../src/server/configuration/default-configuration.ts';

//	-----------------------------------------------------------------
//	defaults
//	-----------------------------------------------------------------

test('server-configurer - no input applies defaults and derives origin', () => {
	const cfg: any = configure(undefined);
	assert.strictEqual(cfg.ssl, false);
	assert.strictEqual(cfg.hostname, 'localhost');
	assert.strictEqual(cfg.port, 3000);
	assert.strictEqual(cfg.origin, 'http://localhost:3000');
	assert.isTrue(Array.isArray(cfg.handlers));
	assert.strictEqual(cfg.handlers.length, DEFAULT_CONFIG.handlers.length);
});

test('server-configurer - empty-object input equals defaults', () => {
	const cfg: any = configure({});
	assert.strictEqual(cfg.origin, 'http://localhost:3000');
	assert.deepEqual(cfg.handlers, DEFAULT_CONFIG.handlers);
});

//	-----------------------------------------------------------------
//	overrides
//	-----------------------------------------------------------------

test('server-configurer - ssl=true switches the derived origin to https', () => {
	const cfg: any = configure({ ssl: true });
	assert.strictEqual(cfg.origin, 'https://localhost:3000');
});

test('server-configurer - custom hostname + port are reflected in origin', () => {
	const cfg: any = configure({ hostname: 'example.test', port: 8080 });
	assert.strictEqual(cfg.origin, 'http://example.test:8080');
});

test('server-configurer - user handlers are merged with defaults (unique)', () => {
	const custom = './handlers/my-custom-handler.ts';
	const cfg: any = configure({ handlers: [custom] });
	assert.isTrue(cfg.handlers.includes(custom));
	//	all defaults preserved
	for (const d of DEFAULT_CONFIG.handlers) {
		assert.isTrue(cfg.handlers.includes(d));
	}
});

test('server-configurer - duplicate handler paths are de-duplicated', () => {
	const defaultHandler = DEFAULT_CONFIG.handlers[0];
	const cfg: any = configure({ handlers: [defaultHandler, defaultHandler] });
	const occurrences = cfg.handlers.filter((h: string) => h === defaultHandler).length;
	assert.strictEqual(occurrences, 1);
});

//	-----------------------------------------------------------------
//	immutability
//	-----------------------------------------------------------------

test('server-configurer - result is frozen', () => {
	const cfg: any = configure({});
	assert.throws(() => { cfg.port = 4000; });
	assert.throws(() => { cfg.origin = 'http://other'; });
});

test('server-configurer - default config is not mutated by input handlers', () => {
	const before = DEFAULT_CONFIG.handlers.length;
	configure({ handlers: ['./handlers/extra-a.ts', './handlers/extra-b.ts'] });
	assert.strictEqual(DEFAULT_CONFIG.handlers.length, before);
});

//	-----------------------------------------------------------------
//	validation — origin
//	-----------------------------------------------------------------

test('server-configurer - rejects hostname that produces an invalid URL', () => {
	//	whitespace in hostname → `new URL(...)` inside the validator
	//	throws 'Invalid URL' before the custom-message branch runs; the
	//	invariant we actually care about is "bad hostname => throws"
	assert.throws(() => configure({ hostname: 'bad host' }));
});

test('server-configurer - rejects NaN port', () => {
	assert.throws(() => configure({ port: NaN }));
});
