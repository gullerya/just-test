import { test } from '@gullerya/just-test';
import { assert } from '@gullerya/just-test/assert';
import { collapseToSessionCoverage } from '../../../../src/runner/environments/browser/coverage-collapse.ts';

function mkSession(suites: any[] = []) {
	return { suites };
}

function mkTest(coverage: any) {
	return { lastRun: coverage === undefined ? null : { coverage } };
}

test('collapseToSessionCoverage - empty session is a no-op, no session.coverage set', () => {
	const s: any = mkSession();
	collapseToSessionCoverage(s);
	assert.isTrue(s.coverage === undefined);
});

test('collapseToSessionCoverage - suites with no covered tests leave session.coverage unset', () => {
	const s: any = mkSession([
		{ tests: [mkTest(undefined), mkTest(null), mkTest([])] }
	]);
	collapseToSessionCoverage(s);
	assert.isTrue(s.coverage === undefined);
});

test('collapseToSessionCoverage - single test with coverage moves it to session and nulls the test entry', () => {
	const cov = [{ url: './a.js', functions: [] }];
	const t = mkTest(cov);
	const s: any = mkSession([{ tests: [t] }]);
	collapseToSessionCoverage(s);
	assert.deepEqual(s.coverage, cov);
	assert.strictEqual(t.lastRun.coverage, null);
});

test('collapseToSessionCoverage - preserves order across suites and tests', () => {
	const a = [{ url: './a.js' }];
	const b = [{ url: './b.js' }];
	const c = [{ url: './c.js' }];
	const s: any = mkSession([
		{ tests: [mkTest(a), mkTest(b)] },
		{ tests: [mkTest(c)] }
	]);
	collapseToSessionCoverage(s);
	assert.deepEqual(s.coverage, [...a, ...b, ...c]);
});

test('collapseToSessionCoverage - skips tests without coverage while keeping those with it', () => {
	const cov = [{ url: './x.js' }];
	const withCov = mkTest(cov);
	const withoutCov = mkTest(null);
	const noRun = mkTest(undefined);
	const s: any = mkSession([{ tests: [withoutCov, withCov, noRun] }]);
	collapseToSessionCoverage(s);
	assert.deepEqual(s.coverage, cov);
	assert.strictEqual(withCov.lastRun.coverage, null);
	assert.strictEqual(withoutCov.lastRun.coverage, null);
	assert.strictEqual(noRun.lastRun, null);
});

test('collapseToSessionCoverage - empty-array coverage is treated as "no coverage" (not copied)', () => {
	const t = mkTest([]);
	const s: any = mkSession([{ tests: [t] }]);
	collapseToSessionCoverage(s);
	assert.isTrue(s.coverage === undefined);
	//	lastRun.coverage stays as the caller set it — not overwritten
	//	because the length guard short-circuits before the null-assign
	assert.deepEqual(t.lastRun.coverage, []);
});
