import { createSuite } from '../dist/just-test.js?minimized=true';
import { Test, STATUSES } from '../dist/test.js';

const suite = createSuite({ name: 'Test object APIs' });

suite.runTest({ name: 'async test - normal flow' }, async test => {
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
	test.assertNotEqual(t.duration, null);
	test.assertNotEqual(t.duration, 0);
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
	test.assertEqual(t2.status, STATUSES.PASSED);

	test.assertTrue(t1.duration >= 1300);
	test.assertTrue(t2.duration >= 1500);
	test.assertTrue(duration >= 1300 && duration <= 1550);
});