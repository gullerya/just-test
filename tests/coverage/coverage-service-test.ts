import { test } from '@gullerya/just-test';
import { assert } from '@gullerya/just-test/assert';
import { collectTargetSources, convertSessionCoverage } from '../../src/coverage/coverage-service.ts';

test('collect sources - empty or null input', async () => {
	let ts = await collectTargetSources();
	assert.deepStrictEqual(ts, []);

	ts = await collectTargetSources({});
	assert.deepStrictEqual(ts, []);
});

test('collect sources - only include', async () => {
	let ts = await collectTargetSources({
		include: '**/coverage-service-test.ts'
	});

	assert.deepStrictEqual(ts, ['tests/coverage/coverage-service-test.ts']);
});

test('collect sources - include and exclude', async () => {
	let ts = await collectTargetSources({
		include: '**/coverage-service-test.ts',
		exclude: '**/*-test.ts'
	});

	assert.deepStrictEqual(ts, []);
});

//	`convertSessionCoverage` is the single host-side V8->jt conversion point.
//	It walks a session and replaces raw V8 payloads on every test.lastRun and
//	on session.coverage itself. Non-raw (already converted) or empty values
//	are left alone.

const STUB_SOURCE = 'line 1\nline 2\nline 3';
const stubTestSource = 'tests/coverage/coverage-service-test.ts';

function rawV8Entry(url = stubTestSource) {
	return {
		url,
		functions: [
			{ functionName: 'f', ranges: [{ startOffset: 0, endOffset: STUB_SOURCE.length, count: 1 }] }
		]
	};
}

function buildSession(overrides: any = {}) {
	return {
		suites: overrides.suites ?? [],
		coverage: overrides.coverage ?? null
	};
}

test('convertSessionCoverage - no suites, no session coverage: no-op', async () => {
	const s = buildSession();
	await convertSessionCoverage(s as any);
	assert.strictEqual(s.coverage, null);
});

test('convertSessionCoverage - converts raw V8 on test.lastRun.coverage', async () => {
	const entry = rawV8Entry();
	const s = buildSession({
		suites: [{
			tests: [{ lastRun: { coverage: [entry] } }]
		}]
	});

	await convertSessionCoverage(s as any);

	const cov = s.suites[0].tests[0].lastRun.coverage;
	assert.isTrue(Array.isArray(cov));
	assert.strictEqual(cov.length, 1);
	//	post-conversion payload is FileCov — has `lines`, no raw `functions`
	assert.isTrue(Array.isArray(cov[0].lines));
});

test('convertSessionCoverage - converts raw V8 on session.coverage', async () => {
	const s = buildSession({ coverage: [rawV8Entry()] });
	await convertSessionCoverage(s as any);
	assert.isTrue(Array.isArray(s.coverage));
	assert.strictEqual(s.coverage.length, 1);
	assert.isTrue(Array.isArray(s.coverage[0].lines));
});

test('convertSessionCoverage - empty arrays left as-is', async () => {
	const s = buildSession({
		suites: [{ tests: [{ lastRun: { coverage: [] } }] }],
		coverage: []
	});
	await convertSessionCoverage(s as any);
	assert.deepStrictEqual(s.suites[0].tests[0].lastRun.coverage, []);
	assert.deepStrictEqual(s.coverage, []);
});

test('convertSessionCoverage - null coverage preserved', async () => {
	const s = buildSession({
		suites: [{ tests: [{ lastRun: { coverage: null } }] }]
	});
	await convertSessionCoverage(s as any);
	assert.strictEqual(s.suites[0].tests[0].lastRun.coverage, null);
});

test('convertSessionCoverage - test without lastRun is skipped', async () => {
	const s = buildSession({
		suites: [{ tests: [{ lastRun: null }, { lastRun: { coverage: [rawV8Entry()] } }] }]
	});
	await convertSessionCoverage(s as any);
	assert.strictEqual(s.suites[0].tests[0].lastRun, null);
	assert.isTrue(Array.isArray(s.suites[0].tests[1].lastRun.coverage[0].lines));
});

test('convertSessionCoverage - missing suites array tolerated', async () => {
	const s: any = { coverage: [rawV8Entry()] };
	await convertSessionCoverage(s);
	assert.isTrue(Array.isArray(s.coverage[0].lines));
});