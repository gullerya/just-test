import { getSuite } from '../dist/just-test.js';
import { STATUSES, runTest } from '../dist/test.js';

const suite = getSuite({ name: 'Single test tests' });

suite.runTest({ name: 'test - normal flow all properties' }, async test => {
	let r = false;

	const
		m = {
			name: 'test-under-test-a',
			code: () => { r = true; }
		},
		tp = runTest(m);

	test.assertEqual(m.name, 'test-under-test-a');
	test.assertFalse(m.skip);
	test.assertEqual(m.status, STATUSES.RUNNING);
	test.assertEqual(m.duration, null);

	test.assertTrue(tp instanceof Promise);
	await tp;
	test.assertTrue(r);
	test.assertEqual(m.status, STATUSES.PASSED);
	test.assertEqual(m.error, null);
	test.assertNotEqual(m.duration, null);
	test.assertNotEqual(m.duration, 0);
});

suite.runTest({ name: 'test - fail by false' }, async test => {
	let r = false;

	const
		m = {
			name: 'test-under-test-fail-by-false',
			code: () => { r = true; return false; }
		};

	await runTest(m);
	test.assertTrue(r);
	test.assertEqual(m.status, STATUSES.FAILED);
	test.assertEqual(m.error, null);
});

suite.runTest({ name: 'test - fail by Error' }, async test => {
	let r = false,
		e;

	const
		m = {
			name: 'test-under-test-fail-by-error',
			code: () => {
				r = true;
				e = new Error('intentional error');
				throw e;
			}
		};

	await runTest(m);
	test.assertTrue(r);
	test.assertEqual(m.status, STATUSES.ERRORED);
	test.assertEqual(m.error, e);
	test.assertEqual(m.error.type, 'Error');
	test.assertTrue(Array.isArray(m.error.stackLines));
	test.assertTrue(m.error.stackLines.length > 2);
});

suite.runTest({ name: 'test - fail by AssertError' }, async test => {
	let r = false;

	const
		m = {
			name: 'test-under-test-fail-by-assert',
			code: tut => {
				r = true;
				tut.assertTrue(false);
			}
		};

	await runTest(m);
	test.assertTrue(r);
	test.assertEqual(m.status, STATUSES.FAILED);
	test.assertEqual(m.error.type, 'AssertError');
	test.assertTrue(Array.isArray(m.error.stackLines));
	test.assertTrue(m.error.stackLines.length > 2);
});

suite.runTest({ name: 'test - fail by fail' }, async test => {
	let r = false;

	const
		m = {
			name: 'test-under-test-fail-by-fail',
			code: tut => {
				r = true;
				tut.fail('intentional error');
			}
		};

	await runTest(m);
	test.assertTrue(r);
	test.assertEqual(m.status, STATUSES.FAILED);
	test.assertEqual(m.error.type, 'AssertError');
	test.assertTrue(Array.isArray(m.error.stackLines));
	test.assertTrue(m.error.stackLines.length > 2);
});

suite.runTest({ name: 'test - fail by expect error and none' }, async test => {
	let r = false;

	const
		m = {
			name: 'test-under-test-fail-by-fail',
			expectError: 'something',
			code: () => r = true
		};

	await runTest(m);
	test.assertTrue(r);
	test.assertEqual(m.status, STATUSES.FAILED);
	test.assertEqual(m.error.type, 'AssertError');
	test.assertTrue(Array.isArray(m.error.stackLines));
	test.assertTrue(m.error.stackLines.length > 1);
});

suite.runTest({ name: 'test - skip' }, async test => {
	let r = false;

	const
		m = {
			name: 'test-under-test-skip',
			skip: true,
			code: () => { r = true; }
		};

	await runTest(m);
	test.assertFalse(r);
	test.assertEqual(m.status, STATUSES.SKIPPED);
	test.assertEqual(m.duration, null);
});

suite.runTest({ name: 'test - timeout' }, async test => {
	let r = false;

	const
		m = {
			name: 'test-under-test-fail-by-timeout',
			timeout: 1000,
			code: async tut => { r = true; await tut.waitMillis(2000); }
		}

	const started = performance.now();
	await runTest(m);
	const duration = performance.now() - started;
	test.assertTrue(r);
	test.assertEqual(m.status, STATUSES.FAILED);
	test.assertEqual(m.error.type, 'TimeoutError');
	test.assertTrue(m.duration > 997 && m.duration < 1050);
	test.assertTrue(duration > 1000 && duration < 1050);

	await test.waitMillis(1200);
	test.assertEqual(m.status, STATUSES.FAILED);
	test.assertEqual(m.error.type, 'TimeoutError');
	test.assertTrue(m.duration > 1000 && m.duration < 1050);
});

suite.runTest({ name: 'few async tests - normal flow' }, async test => {
	let r1 = false,
		r2 = false;

	const
		m1 = {
			name: 'test-under-test-b1',
			code: async it => {
				await it.waitMillis(1300);
				r1 = true;
			}
		},
		m2 = {
			name: 'test-under-test-b2',
			code: async it => {
				await it.waitMillis(1500);
				r2 = true;
				it.assertFalse(true);
			}
		}

	const
		started = performance.now(),
		tp1 = runTest(m1),
		tp2 = runTest(m2);

	await Promise.all([tp1, tp2]);

	const duration = performance.now() - started;

	test.assertTrue(r1);
	test.assertTrue(r2);
	test.assertEqual(m1.status, STATUSES.PASSED);
	test.assertEqual(m2.status, STATUSES.FAILED);

	test.assertTrue(m1.duration >= 1300);
	test.assertTrue(m2.duration >= 1497);
	test.assertTrue(duration >= 1300 && duration <= 1550);
});

suite.runTest({ name: 'test - API negative A', expectError: 'model MUST be a non-null object' }, async () => {
	const t = await runTest('some string');
});

suite.runTest({ name: 'test - API negative B', expectError: 'name MUST be a non empty string within the option' }, async () => {
	const t = await runTest({});
});

suite.runTest({ name: 'test - API negative C', expectError: 'test code MUST be a function' }, async () => {
	const t = await runTest({ name: 'some name' });
});

suite.runTest({ name: 'test - API negative D', expectError: 'test code MUST be a function' }, async () => {
	const t = await runTest({ name: 'some name', code: {} });
});