import { test } from '@gullerya/just-test';
import { assert } from '@gullerya/just-test/assert';
import buildConfig from '../../../src/server/sessions/sessions-configurer.ts';

const minimalEnv = () => ({
	interactive: true,
	tests: { include: ['./tests/**/*'] }
});

//	-----------------------------------------------------------------
//	top-level validation
//	-----------------------------------------------------------------

test('sessions-configurer - rejects null input', () => {
	assert.throws(() => buildConfig(null));
});

test('sessions-configurer - rejects non-object input', () => {
	assert.throws(() => buildConfig('hello'));
	assert.throws(() => buildConfig(42));
});

test('sessions-configurer - rejects missing environments', () => {
	assert.throws(() => buildConfig({}));
});

test('sessions-configurer - rejects non-array environments', () => {
	assert.throws(() => buildConfig({ environments: 'everywhere' }));
});

test('sessions-configurer - rejects empty environments', () => {
	assert.throws(() => buildConfig({ environments: [] }));
});

//	-----------------------------------------------------------------
//	happy path
//	-----------------------------------------------------------------

test('sessions-configurer - happy path returns frozen object with environments map', () => {
	const out: any = buildConfig({ environments: [minimalEnv()] });
	assert.isTrue(typeof out === 'object' && out !== null);
	assert.throws(() => { out.foo = 'bar'; });
	assert.isTrue(typeof out.environments === 'object' && out.environments !== null);
	const ids = Object.keys(out.environments);
	assert.strictEqual(ids.length, 1);
});

test('sessions-configurer - each environment gets an 8-char id', () => {
	const out: any = buildConfig({ environments: [minimalEnv()] });
	const [id] = Object.keys(out.environments);
	assert.strictEqual(typeof id, 'string');
	assert.strictEqual(id.length, 8);
	//	id is also attached to the enriched env entry
	assert.strictEqual(out.environments[id].id, id);
});

test('sessions-configurer - each environment is enriched with tests and coverage', () => {
	const out: any = buildConfig({ environments: [minimalEnv()] });
	const env = Object.values(out.environments)[0] as any;
	assert.isTrue(typeof env.tests === 'object' && env.tests !== null);
	//	testing-configurer applies defaults
	assert.strictEqual(env.tests.ttl, 60000);
	assert.strictEqual(env.tests.maxFail, 0);
	//	coverage defaults applied when omitted
	assert.isTrue(typeof env.coverage === 'object' && env.coverage !== null);
});

test('sessions-configurer - propagates downstream configurer failures (bad env)', () => {
	//	unknown browser type -> environments-configurer throws
	assert.throws(() => buildConfig({
		environments: [{
			browser: { type: 'opera' },
			tests: { include: ['./tests/**/*'] }
		}]
	}));
});

test('sessions-configurer - propagates downstream configurer failures (bad tests)', () => {
	//	missing include -> testing-configurer throws
	assert.throws(() => buildConfig({
		environments: [{ interactive: true, tests: {} }]
	}));
});

test('sessions-configurer - multiple environments each get distinct ids', () => {
	const out: any = buildConfig({
		environments: [minimalEnv(), minimalEnv(), minimalEnv()]
	});
	const ids = Object.keys(out.environments);
	assert.strictEqual(ids.length, 3);
	assert.strictEqual(new Set(ids).size, 3);
});
