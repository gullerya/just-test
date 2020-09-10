import { getSuite } from '/core/just-test.js';
// import { obtainSuite } from '/core/suites-service.js';

const
	suite = getSuite('Suite object APIs');

// suite.test({ name: 'suite - basic full flow' }, async test => {
// 	const s = new Suite('suite-under-test');

// 	s.test({ name: 't1' }, () => { });
// 	s.test({ name: 't2' }, () => { });

// 	await s.done;

// 	test.assertEqual(2, s.model.tests.length);
// 	test.assertNotEqual(null, s.model.duration);
// 	test.assertTrue(s.model.duration > 0);
// });

suite.test({ name: 'suite - skipping this one (UI/manual test)', skip: true }, () => {
});

suite.test({ name: 'suite - erroring this one (UI/manual test)' }, () => {
	throw new Error('intentional');
});

suite.test({ name: 'suite - timing out this one (UI/manual test)', ttl: 500 }, async t => {
	await t.waitMillis(1000);
});

suite.test({ name: 'suite - failing this one (UI/manual test)' }, t => {
	t.assertNotEqual(1, 1);
});

// suite.test({ name: 'suite - all async' }, async test => {
// 	const s = new Suite('suite-under-test');

// 	s.test({ name: 't1' }, async t1 => { await t1.waitMillis(700); });
// 	s.test({ name: 't2' }, async t2 => { await t2.waitMillis(900); });

// 	await s.done;

// 	test.assertEqual(2, s.model.tests.length);
// 	test.assertTrue(s.model.duration > 897);
// });

// suite.test({ name: 'suite - all sync' }, async test => {
// 	const s = new Suite('suite-under-test');

// 	s.test({ name: 't1', sync: true }, async t1 => { await t1.waitMillis(700); });
// 	s.test({ name: 't2', sync: true }, async t2 => { await t2.waitMillis(900); });

// 	await s.done;

// 	test.assertEqual(2, s.model.tests.length);
// 	test.assertTrue(s.model.duration > 1600);
// });

// suite.test({ name: 'suite - API negative A', expectError: 'suite model MUST be a non-null object' }, () => {
// 	new Suite();
// });

//	this is the test to play with uncaughtrejection, just remove the return keyword from below
suite.test({ name: 'suite - uncaught error from wrong asyns test', expectError: 'wrongly done async test' }, test => {
	return test.waitNextTask()
		.then(() => {
			throw new Error('wrongly done async test');
		});
});