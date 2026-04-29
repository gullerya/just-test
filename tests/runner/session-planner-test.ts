import { test } from '@gullerya/just-test';
import { assert } from '@gullerya/just-test/assert';
import { planSession } from '../../src/runner/session-planner.ts';
import StateService from '../../src/runner/state-service.ts';

//	In browsers the static handler serves the repo root at `/static/`;
//	in Node a file:// URL resolves the absolute path. Unique query-string
//	per call avoids the module cache between tests — each `planSession`
//	call must actually re-import the fixture so it re-registers.
const isBrowser = typeof window !== 'undefined';
let callCounter = 0;
function resolveSource(s: string): string {
	callCounter++;
	if (isBrowser) {
		return `/static/${s}?n=${callCounter}`;
	}
	return new URL(`../../${s}?n=${callCounter}`, import.meta.url).toString();
}

//	`planSession` mutates the global execution context symbol. In page
//	mode all tests share one `globalThis` with the running test, so
//	without save/restore the outer TEST context gets clobbered and the
//	current test's completion callback is lost, causing a TTL timeout.
//	Iframe and Node isolate each test in a fresh global, so it's
//	harmless there — but restoring keeps the tests portable.
const EXEC_SYMBOL = Symbol.for('JUST_TEST_EXECUTION_CONTEXT');
async function runPlan(
	sources: string[],
	svc: StateService,
	resolve = resolveSource
): Promise<void> {
	const saved = (globalThis as any)[EXEC_SYMBOL];
	try {
		await planSession(sources, svc, resolve);
	} finally {
		(globalThis as any)[EXEC_SYMBOL] = saved;
	}
}

test('planSession - empty resource list is a no-op', async () => {
	const svc = new StateService();
	await runPlan([], svc);
	assert.strictEqual(svc.session.suites.length, 0);
	assert.strictEqual(svc.session.total, 0);
});

test('planSession - registers tests from a single fixture', async () => {
	const svc = new StateService();
	await runPlan(['tests/runner/_planner-fixtures/one-test.ts'], svc);

	assert.strictEqual(svc.session.suites.length, 1);
	const suite = svc.session.suites[0];
	assert.strictEqual(suite.name, 'tests/runner/_planner-fixtures/one-test.ts');
	assert.strictEqual(suite.tests.length, 1);
	assert.strictEqual(suite.tests[0].name, 'lonely');
	assert.strictEqual(suite.tests[0].source, 'tests/runner/_planner-fixtures/one-test.ts');
});

test('planSession - registers multiple tests and propagates only-mode', async () => {
	const svc = new StateService();
	await runPlan(['tests/runner/_planner-fixtures/two-tests.ts'], svc);

	const suite = svc.session.suites[0];
	assert.strictEqual(suite.tests.length, 2);
	const names = suite.tests.map(t => t.name);
	assert.deepEqual(names, ['fixture-test-1', 'fixture-test-2']);
	assert.isTrue(suite.onlyMode);
});

test('planSession - reports import failures as TestError, keeps going', async () => {
	const svc = new StateService();
	await runPlan(
		[
			'tests/runner/_planner-fixtures/throws-on-import.ts',
			'tests/runner/_planner-fixtures/one-test.ts'
		],
		svc
	);

	assert.strictEqual(svc.session.errors.length, 1);
	assert.strictEqual(svc.session.error, 1);
	assert.isTrue(svc.session.errors[0].message.includes('boom from fixture'));

	//	planning continues past a failing source
	const lonely = svc.session.suites.find(s => s.name.endsWith('one-test.ts'));
	assert.isTrue(lonely !== undefined);
	assert.strictEqual(lonely.tests.length, 1);
});

test('planSession - independent StateServices accumulate independently', async () => {
	const a = new StateService();
	const b = new StateService();
	await runPlan(['tests/runner/_planner-fixtures/one-test.ts'], a);
	await runPlan(['tests/runner/_planner-fixtures/two-tests.ts'], b);

	assert.strictEqual(a.session.total, 1);
	assert.strictEqual(b.session.total, 2);
});
