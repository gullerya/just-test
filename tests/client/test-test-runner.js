import { STATUS } from '/aut/bin/client/common/constants.js';
import { runTest } from '/aut/bin/client/common/test-runner.js';

const suite = globalThis.getSuite('Test APIs');

suite.test('run test - normal', async test => {
	let ta;
	const tp = runTest(_ta => {
		ta = _ta;
	});

	//	TODO: assert on ta object
	test.assert.instanceOf(tp, Promise);
	const m = await tp;
	console.log(m);
	test.assert.equal(STATUS.PASS, m.status);
	test.assert.equal(undefined, m.error);
	test.assert.isNotNull(m.time);
	test.assert.notEqual(0, m.time);
});

// suite.test('test - fail by false', async test => {
// 	let r = false;

// 	const m = await runTestCode(() => { r = true; return false; }, {});
// 	test.assertTrue(r);
// 	test.assertEqual(m.status, STATUS.FAIL);
// 	test.assertEqual(m.error, null);
// });

// suite.test('test - fail by Error', async test => {
// 	let r = false,
// 		e;

// 	const
// 		m = {
// 			meta: {
// 				name: 'test-under-test-fail-by-error'
// 			},
// 			code: () => {
// 				r = true;
// 				e = new Error('intentional error');
// 				throw e;
// 			}
// 		};

// 	await runTestCode(m);
// 	test.assertTrue(r);
// 	test.assertEqual(m.status, STATUS.FAIL);
// 	test.assertEqual(m.error, e);
// 	test.assertEqual(m.error.type, 'Error');
// 	test.assertTrue(Array.isArray(m.error.stackLines));
// 	test.assertTrue(m.error.stackLines.length > 2);
// });

// suite.test('test - fail by AssertError', async test => {
// 	let r = false;

// 	const
// 		m = {
// 			meta: {
// 				name: 'test-under-test-fail-by-assert'
// 			},
// 			code: tut => {
// 				r = true;
// 				tut.assertTrue(false);
// 			}
// 		};

// 	await runTestCode(m);
// 	test.assertTrue(r);
// 	test.assertEqual(m.status, STATUS.FAIL);
// 	test.assertEqual(m.error.type, 'AssertError');
// 	test.assertTrue(Array.isArray(m.error.stackLines));
// 	test.assertTrue(m.error.stackLines.length > 2);
// });

// suite.test('test - fail by fail', async test => {
// 	let r = false;

// 	const
// 		m = {
// 			meta: {
// 				name: 'test-under-test-fail-by-fail'
// 			},
// 			code: tut => {
// 				r = true;
// 				tut.fail('intentional error');
// 			}
// 		};

// 	await runTestCode(m);
// 	test.assertTrue(r);
// 	test.assertEqual(m.status, STATUS.FAIL);
// 	test.assertEqual(m.error.type, 'AssertError');
// 	test.assertTrue(Array.isArray(m.error.stackLines));
// 	test.assertTrue(m.error.stackLines.length > 2);
// });

// suite.test('test - fail by expect error and none', async test => {
// 	let r = false;

// 	const
// 		m = {
// 			meta: {
// 				name: 'test-under-test-fail-by-fail',
// 				expectError: 'something'
// 			},
// 			code: () => r = true
// 		};

// 	await runTestCode(m);
// 	test.assertTrue(r);
// 	test.assertEqual(m.status, STATUS.FAIL);
// 	test.assertEqual(m.error.type, 'AssertError');
// 	test.assertTrue(Array.isArray(m.error.stackLines));
// 	test.assertTrue(m.error.stackLines.length > 1);
// });

// suite.test('test - skip', async test => {
// 	let r = false;

// 	const
// 		m = {
// 			meta: {
// 				name: 'test-under-test-skip',
// 				skip: true
// 			},
// 			code: () => { r = true; }
// 		};

// 	await runTestCode(m);
// 	test.assertFalse(r);
// 	test.assertEqual(m.status, STATUS.SKIP);
// 	test.assertEqual(m.time, null);
// });

// suite.test('test - ttl', async test => {
// 	let r = false;

// 	const
// 		m = {
// 			meta: {
// 				name: 'test-under-test-fail-by-timeout',
// 				ttl: 1000
// 			},
// 			code: async tut => { r = true; await tut.waitMillis(2000); }
// 		}

// 	const started = performance.now();
// 	await runTestCode(m);
// 	const time = performance.now() - started;
// 	test.assertTrue(r);
// 	test.assertEqual(m.status, STATUS.FAIL);
// 	test.assertEqual(m.error.type, 'TimeoutError');
// 	test.assertTrue(m.time > 997 && m.time < 1050);
// 	test.assertTrue(time > 1000 && time < 1050);

// 	await test.waitMillis(1200);
// 	test.assertEqual(m.status, STATUS.FAIL);
// 	test.assertEqual(m.error.type, 'TimeoutError');
// 	test.assertTrue(m.time > 1000 && m.time < 1050);
// });

// suite.test('few async tests - normal flow', async test => {
// 	let r1 = false,
// 		r2 = false;

// 	const
// 		m1 = {
// 			meta: {
// 				name: 'test-under-test-b1'
// 			},
// 			code: async it => {
// 				await it.waitMillis(1300);
// 				r1 = true;
// 			}
// 		},
// 		m2 = {
// 			meta: {
// 				name: 'test-under-test-b2'
// 			},
// 			code: async it => {
// 				await it.waitMillis(1500);
// 				r2 = true;
// 				it.assertFalse(true);
// 			}
// 		}

// 	const
// 		started = performance.now(),
// 		tp1 = runTestCode(m1),
// 		tp2 = runTestCode(m2);

// 	await Promise.all([tp1, tp2]);

// 	const time = performance.now() - started;

// 	test.assertTrue(r1);
// 	test.assertTrue(r2);
// 	test.assertEqual(m1.status, STATUS.PASS);
// 	test.assertEqual(m2.status, STATUS.FAIL);

// 	test.assertTrue(m1.time >= 1300);
// 	test.assertTrue(m2.time >= 1497);
// 	test.assertTrue(time >= 1300 && time <= 1550);
// });

// suite.test('test - API negative A', async () => {
// 	await runTestCode('some string');
// }, {
// 	expectError: 'test meta MUST be a non-null object'
// });

// suite.test('test - API negative B', async () => {
// 	await runTestCode({});
// }, {
// 	expectError: 'name MUST be a non empty string within the option'
// });

// suite.test('test - API negative C', async () => {
// 	await runTestCode({ name: 'some name' });
// }, {
// 	expectError: 'test code MUST be a function'
// });

// suite.test('test - API negative D', async () => {
// 	await runTestCode({ name: 'some name', code: {} });
// }, {
// 	expectError: 'test code MUST be a function'
// });