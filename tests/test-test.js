import { createSuite } from '../dist/just-test.js?minimized=true';
import { Test, STATUSES, AssertError, TimeoutError } from '../dist/test.js';

const suite = createSuite({ name: 'Single test tests' });

suite.runTest({ name: 'test - normal flow all properties' }, async test => {
	let r = false;

	const
		f = () => { r = true; },
		t = new Test({ name: 'test-under-test-a' }, f);

	test.assertTrue(Boolean(t));
	test.assertEqual(t.name, 'test-under-test-a');
	test.assertFalse(t.sync);
	test.assertFalse(t.skip);
	test.assertEqual(t.code, f);
	test.assertEqual(t.status, STATUSES.QUEUED);
	test.assertEqual(t.duration, null);

	const tp = t.run();
	test.assertEqual(t.status, STATUSES.RUNNING);
	test.assertTrue(tp instanceof Promise);
	await tp;
	test.assertTrue(r);
	test.assertEqual(t.status, STATUSES.PASSED);
	test.assertEqual(t.error, null);
	test.assertNotEqual(t.duration, null);
	test.assertNotEqual(t.duration, 0);
});

suite.runTest({ name: 'test - fail by false' }, async test => {
	let r = false;

	const
		f = () => { r = true; return false; },
		t = new Test({ name: 'test-under-test-fail-by-false' }, f);

	await t.run();
	test.assertTrue(r);
	test.assertEqual(t.status, STATUSES.FAILED);
	test.assertEqual(t.error, null);
});

suite.runTest({ name: 'test - fail by Error' }, async test => {
	let r = false,
		e;

	const
		f = () => {
			r = true;
			e = new Error('intentional error');
			throw e;
		},
		t = new Test({ name: 'test-under-test-fail-by-error' }, f);

	await t.run();
	test.assertTrue(r);
	test.assertEqual(t.status, STATUSES.ERRORED);
	test.assertEqual(t.error, e);
	test.assertEqual(t.error.type, 'Error');
	test.assertTrue(Array.isArray(t.error.stackLines));
	test.assertTrue(t.error.stackLines.length > 2);
});

suite.runTest({ name: 'test - fail by AssertError' }, async test => {
	let r = false;

	const
		f = tut => {
			r = true;
			tut.assertTrue(false);
		},
		t = new Test({ name: 'test-under-test-fail-by-assert' }, f);

	await t.run();
	test.assertTrue(r);
	test.assertEqual(t.status, STATUSES.FAILED);
	test.assertTrue(t.error instanceof AssertError);
	test.assertEqual(t.error.type, 'AssertError');
	test.assertTrue(Array.isArray(t.error.stackLines));
	test.assertTrue(t.error.stackLines.length > 2);
});

suite.runTest({ name: 'test - fail by fail' }, async test => {
	let r = false;

	const
		f = tut => {
			r = true;
			tut.fail('intentional error');
		},
		t = new Test({ name: 'test-under-test-fail-by-fail' }, f);

	await t.run();
	test.assertTrue(r);
	test.assertEqual(t.status, STATUSES.FAILED);
	test.assertTrue(t.error instanceof AssertError);
	test.assertEqual(t.error.type, 'AssertError');
	test.assertTrue(Array.isArray(t.error.stackLines));
	test.assertTrue(t.error.stackLines.length > 2);
});

suite.runTest({ name: 'test - fail by expect error and none' }, async test => {
	let r = false;

	const
		f = () => r = true,
		t = new Test({ name: 'test-under-test-fail-by-fail', expectError: 'something' }, f);

	await t.run();
	test.assertTrue(r);
	test.assertEqual(t.status, STATUSES.FAILED);
	test.assertTrue(t.error instanceof AssertError);
	test.assertEqual(t.error.type, 'AssertError');
	test.assertTrue(Array.isArray(t.error.stackLines));
	test.assertTrue(t.error.stackLines.length > 2);
});

suite.runTest({ name: 'test - skip' }, async test => {
	let r = false;

	const
		f = () => { r = true; },
		t = new Test({ name: 'test-under-test-skip', skip: true }, f);

	await t.run();
	test.assertFalse(r);
	test.assertEqual(t.status, STATUSES.SKIPPED);
	test.assertEqual(t.duration, null);
});

suite.runTest({ name: 'test - timeout' }, async test => {
	let r = false;

	const
		f = async tut => { r = true; await tut.waitMillis(2000); },
		t = new Test({ name: 'test-under-test-fail-by-timeout', timeout: 1000 }, f);

	const started = performance.now();
	await t.run();
	const duration = performance.now() - started;
	test.assertTrue(r);
	test.assertEqual(t.status, STATUSES.FAILED);
	test.assertTrue(t.error instanceof TimeoutError);
	test.assertTrue(t.duration > 1000 && t.duration < 1050);

	test.assertTrue(duration > 1000 && t.duration < 1050);
	await test.waitMillis(1200);
	test.assertEqual(t.status, STATUSES.FAILED);
	test.assertTrue(t.error instanceof TimeoutError);
	test.assertTrue(t.duration > 1000 && t.duration < 1050);
});

suite.runTest({ name: 'few async tests - normal flow' }, async test => {
	let r1 = false,
		r2 = false;

	const
		f1 = async it => {
			await it.waitMillis(1300);
			r1 = true;
		},
		f2 = async it => {
			await it.waitMillis(1500);
			r2 = true;
			it.assertFalse(true);
		},
		t1 = new Test({ name: 'test-under-test-b1' }, f1),
		t2 = new Test({ name: 'test-under-test-b2' }, f2);

	const
		started = performance.now(),
		tp1 = t1.run(),
		tp2 = t2.run();

	await Promise.all([tp1, tp2]);

	const duration = performance.now() - started;

	test.assertTrue(r1);
	test.assertTrue(r2);
	test.assertEqual(t1.status, STATUSES.PASSED);
	test.assertEqual(t2.status, STATUSES.FAILED);

	test.assertTrue(t1.duration >= 1300);
	test.assertTrue(t2.duration >= 1500);
	test.assertTrue(duration >= 1300 && duration <= 1550);
});

suite.runTest({ name: 'test - API negative A', expectError: 'options MUST be a non-null object' }, () => {
	const t = new Test('some string');
});

suite.runTest({ name: 'test - API negative B', expectError: 'name MUST be a non empty string within the option' }, () => {
	const t = new Test({});
});

suite.runTest({ name: 'test - API negative C', expectError: 'test code MUST be a function' }, () => {
	const t = new Test({ name: 'some name' });
});

suite.runTest({ name: 'test - API negative D', expectError: 'test code MUST be a function' }, () => {
	const t = new Test({ name: 'some name' }, {});
});
