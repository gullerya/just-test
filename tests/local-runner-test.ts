import { test } from '@gullerya/just-test';
import { assert } from '@gullerya/just-test/assert';
import { applyFilesOverride, deriveEnvSuffix } from '../src/local-runner.ts';

//	Representative input: the shape local-runner actually encounters
//	after importing a config module — `environments: [...]` with `tests`
//	holding include/exclude arrays.
function twoEnvConfig() {
	return {
		environments: [
			{
				node: true,
				tests: {
					ttl: 300000,
					maxFail: 0,
					include: ['./tests/**/*'],
					exclude: ['**/_configs/**', '**/_worker/**']
				},
				coverage: { include: ['./src/**/*'] }
			},
			{
				browser: { type: 'chromium', executors: { type: 'iframe' } },
				tests: {
					ttl: 300000,
					maxFail: 0,
					include: ['./tests/**/*'],
					exclude: ['**/_configs/**', '**/server/**']
				}
			}
		]
	};
}

//	-----------------------------------------------------------------
//	validation
//	-----------------------------------------------------------------

test('applyFilesOverride - rejects empty pattern', () => {
	assert.throws(
		() => applyFilesOverride(twoEnvConfig(), ''),
		`'files' argument MUST be a non-empty string`
	);
});

test('applyFilesOverride - rejects non-string pattern', () => {
	assert.throws(
		() => applyFilesOverride(twoEnvConfig(), null as any),
		`'files' argument MUST be a non-empty string`
	);
	assert.throws(
		() => applyFilesOverride(twoEnvConfig(), 42 as any),
		`'files' argument MUST be a non-empty string`
	);
});

test('applyFilesOverride - rejects config without environments[]', () => {
	assert.throws(
		() => applyFilesOverride({}, 'x'),
		`config MUST have an 'environments' array`
	);
	assert.throws(
		() => applyFilesOverride({ environments: 'nope' } as any, 'x'),
		`config MUST have an 'environments' array`
	);
	assert.throws(
		() => applyFilesOverride(null as any, 'x'),
		`config MUST have an 'environments' array`
	);
});

//	-----------------------------------------------------------------
//	override semantics — include replaced, exclude cleared
//	-----------------------------------------------------------------

test('applyFilesOverride - single file path replaces include and clears exclude', () => {
	const filePath = './tests/server/orchestrator-client-test.ts';
	const out: any = applyFilesOverride(twoEnvConfig(), filePath);
	assert.strictEqual(out.environments.length, 2);
	for (const env of out.environments) {
		assert.deepEqual(env.tests.include, [filePath]);
		assert.deepEqual(env.tests.exclude, []);
	}
});

test('applyFilesOverride - glob pattern is stored verbatim (resolution happens downstream)', () => {
	const pattern = './tests/**/*-test.ts';
	const out: any = applyFilesOverride(twoEnvConfig(), pattern);
	for (const env of out.environments) {
		assert.deepEqual(env.tests.include, [pattern]);
		assert.deepEqual(env.tests.exclude, []);
	}
});

test('applyFilesOverride - applies uniformly to every environment in a multi-env config', () => {
	const out: any = applyFilesOverride(twoEnvConfig(), 'x.ts');
	assert.strictEqual(out.environments.length, 2);
	assert.isTrue('node' in out.environments[0]);
	assert.isTrue('browser' in out.environments[1]);
	//	both got the override
	assert.deepEqual(out.environments[0].tests.include, ['x.ts']);
	assert.deepEqual(out.environments[1].tests.include, ['x.ts']);
});

//	-----------------------------------------------------------------
//	immutability — original config untouched (important: configs are
//	often imported ESM modules whose exports are frozen or shared)
//	-----------------------------------------------------------------

test('applyFilesOverride - does not mutate the input config', () => {
	const original = twoEnvConfig();
	const snapshot = JSON.stringify(original);
	applyFilesOverride(original, 'some-file.ts');
	assert.strictEqual(JSON.stringify(original), snapshot);
});

test('applyFilesOverride - non-tests fields on each environment are preserved', () => {
	const input = twoEnvConfig();
	const out: any = applyFilesOverride(input, 'x.ts');
	assert.strictEqual(out.environments[0].node, true);
	assert.deepEqual(out.environments[0].coverage, { include: ['./src/**/*'] });
	assert.deepEqual(
		out.environments[1].browser,
		{ type: 'chromium', executors: { type: 'iframe' } }
	);
});

test('applyFilesOverride - preserves other tests.* fields (ttl, maxFail, ...)', () => {
	const out: any = applyFilesOverride(twoEnvConfig(), 'x.ts');
	assert.strictEqual(out.environments[0].tests.ttl, 300000);
	assert.strictEqual(out.environments[0].tests.maxFail, 0);
});

test('applyFilesOverride - works when an env has no tests field (creates one)', () => {
	const cfg = { environments: [{ node: true }] };
	const out: any = applyFilesOverride(cfg, 'x.ts');
	assert.deepEqual(out.environments[0].tests.include, ['x.ts']);
	assert.deepEqual(out.environments[0].tests.exclude, []);
	assert.strictEqual(out.environments[0].node, true);
});

//	deriveEnvSuffix — keeps per-env coverage artifacts discriminated in
//	`reports/` so matrix configs don't overwrite each other
//
test('deriveEnvSuffix - node env', () => {
	assert.strictEqual(deriveEnvSuffix({ node: true }), 'nodejs');
});

test('deriveEnvSuffix - interactive env', () => {
	assert.strictEqual(deriveEnvSuffix({ interactive: true }), 'interactive');
});

test('deriveEnvSuffix - browser with explicit executor', () => {
	assert.strictEqual(
		deriveEnvSuffix({ browser: { type: 'chromium', executors: { type: 'page' } } }),
		'chromium-page'
	);
	assert.strictEqual(
		deriveEnvSuffix({ browser: { type: 'firefox', executors: { type: 'worker' } } }),
		'firefox-worker'
	);
});

test('deriveEnvSuffix - browser defaults executor to iframe when missing', () => {
	assert.strictEqual(
		deriveEnvSuffix({ browser: { type: 'webkit' } }),
		'webkit-iframe'
	);
});

test('deriveEnvSuffix - falls back to "env" for unrecognized shape', () => {
	assert.strictEqual(deriveEnvSuffix({}), 'env');
	assert.strictEqual(deriveEnvSuffix(null), 'env');
	assert.strictEqual(deriveEnvSuffix(undefined), 'env');
});
