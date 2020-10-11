import { getSuite } from '/aut/bin/client/just-test.js';
import { RESULT } from '/aut/bin/client/utils.js';
import { executeTest } from '/aut/bin/client/services/test-executor.js';

const suite = getSuite('Single test tests');

suite.test('test - normal flow all properties', async test => {
	let r = false;

	const
		m = {
			meta: {
				name: 'test-under-test-a'
			},
			code: () => { r = true; }
		},
		tp = executeTest(m);

	test.assertEqual('test-under-test-a', m.meta.name);
	test.assertFalse(m.meta.skip);
	test.assertEqual(m.meta.status, RESULT.RUNNING);
	test.assertEqual(m.duration, null);

	test.assertTrue(tp instanceof Promise);
	await tp;
	test.assertTrue(r);
	test.assertEqual(m.status, RESULT.PASS);
	test.assertEqual(m.error, null);
	test.assertNotEqual(m.duration, null);
	test.assertNotEqual(m.duration, 0);
});

suite.test('test - fail by false', async test => {
	let r = false;

	const
		m = {
			meta: {
				name: 'test-under-test-fail-by-false'
			},
			code: () => { r = true; return false; }
		};

	await executeTest(m);
	test.assertTrue(r);
	test.assertEqual(m.status, RESULT.FAIL);
	test.assertEqual(m.error, null);
});

suite.test('test - fail by Error', async test => {
	let r = false,
		e;

	const
		m = {
			meta: {
				name: 'test-under-test-fail-by-error'
			},
			code: () => {
				r = true;
				e = new Error('intentional error');
				throw e;
			}
		};

	await executeTest(m);
	test.assertTrue(r);
	test.assertEqual(m.status, RESULT.ERROR);
	test.assertEqual(m.error, e);
	test.assertEqual(m.error.type, 'Error');
	test.assertTrue(Array.isArray(m.error.stackLines));
	test.assertTrue(m.error.stackLines.length > 2);
});

suite.test('test - fail by AssertError', async test => {
	let r = false;

	const
		m = {
			meta: {
				name: 'test-under-test-fail-by-assert'
			},
			code: tut => {
				r = true;
				tut.assertTrue(false);
			}
		};

	await executeTest(m);
	test.assertTrue(r);
	test.assertEqual(m.status, RESULT.FAIL);
	test.assertEqual(m.error.type, 'AssertError');
	test.assertTrue(Array.isArray(m.error.stackLines));
	test.assertTrue(m.error.stackLines.length > 2);
});

suite.test('test - fail by fail', async test => {
	let r = false;

	const
		m = {
			meta: {
				name: 'test-under-test-fail-by-fail'
			},
			code: tut => {
				r = true;
				tut.fail('intentional error');
			}
		};

	await executeTest(m);
	test.assertTrue(r);
	test.assertEqual(m.status, RESULT.FAIL);
	test.assertEqual(m.error.type, 'AssertError');
	test.assertTrue(Array.isArray(m.error.stackLines));
	test.assertTrue(m.error.stackLines.length > 2);
});

suite.test('test - fail by expect error and none', async test => {
	let r = false;

	const
		m = {
			meta: {
				name: 'test-under-test-fail-by-fail',
				expectError: 'something'
			},
			code: () => r = true
		};

	await executeTest(m);
	test.assertTrue(r);
	test.assertEqual(m.status, RESULT.FAIL);
	test.assertEqual(m.error.type, 'AssertError');
	test.assertTrue(Array.isArray(m.error.stackLines));
	test.assertTrue(m.error.stackLines.length > 1);
});

suite.test('test - skip', async test => {
	let r = false;

	const
		m = {
			meta: {
				name: 'test-under-test-skip',
				skip: true
			},
			code: () => { r = true; }
		};

	await executeTest(m);
	test.assertFalse(r);
	test.assertEqual(m.status, RESULT.SKIP);
	test.assertEqual(m.duration, null);
});

suite.test('test - ttl', async test => {
	let r = false;

	const
		m = {
			meta: {
				name: 'test-under-test-fail-by-timeout',
				ttl: 1000
			},
			code: async tut => { r = true; await tut.waitMillis(2000); }
		}

	const started = performance.now();
	await executeTest(m);
	const duration = performance.now() - started;
	test.assertTrue(r);
	test.assertEqual(m.status, RESULT.FAIL);
	test.assertEqual(m.error.type, 'TimeoutError');
	test.assertTrue(m.duration > 997 && m.duration < 1050);
	test.assertTrue(duration > 1000 && duration < 1050);

	await test.waitMillis(1200);
	test.assertEqual(m.status, RESULT.FAIL);
	test.assertEqual(m.error.type, 'TimeoutError');
	test.assertTrue(m.duration > 1000 && m.duration < 1050);
});

suite.test('few async tests - normal flow', async test => {
	let r1 = false,
		r2 = false;

	const
		m1 = {
			meta: {
				name: 'test-under-test-b1'
			},
			code: async it => {
				await it.waitMillis(1300);
				r1 = true;
			}
		},
		m2 = {
			meta: {
				name: 'test-under-test-b2'
			},
			code: async it => {
				await it.waitMillis(1500);
				r2 = true;
				it.assertFalse(true);
			}
		}

	const
		started = performance.now(),
		tp1 = executeTest(m1),
		tp2 = executeTest(m2);

	await Promise.all([tp1, tp2]);

	const duration = performance.now() - started;

	test.assertTrue(r1);
	test.assertTrue(r2);
	test.assertEqual(m1.status, RESULT.PASS);
	test.assertEqual(m2.status, RESULT.FAIL);

	test.assertTrue(m1.duration >= 1300);
	test.assertTrue(m2.duration >= 1497);
	test.assertTrue(duration >= 1300 && duration <= 1550);
});

suite.test('test - API negative A', async () => {
	await executeTest('some string');
}, {
	expectError: 'test meta MUST be a non-null object'
});

suite.test('test - API negative B', async () => {
	await executeTest({});
}, {
	expectError: 'name MUST be a non empty string within the option'
});

suite.test('test - API negative C', async () => {
	await executeTest({ name: 'some name' });
}, {
	expectError: 'test code MUST be a function'
});

suite.test('test - API negative D', async () => {
	await executeTest({ name: 'some name', code: {} });
}, {
	expectError: 'test code MUST be a function'
});