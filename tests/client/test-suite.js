import { getSuite } from '/aut/bin/client/env-browser/browser-test-runner.js';

const
	suite = globalThis.getSuite('Suite object APIs');

suite.test('suite - basic full flow', async test => {
	const d = document.createElement('div');
	d.textContent = 'suite - basic full flow';
	document.body.appendChild(d);

	const s = getSuite('suite-under-test');

	s.test('t1', () => { });
	s.test('t2', () => { });

	await s.done;

	test.assertEqual(2, s.model.tests.length);
	test.assertNotEqual(null, s.model.time);
	test.assertTrue(s.model.time > 0);
});

suite.test('suite - skipping this one (UI/manual test)', () => {
}, { skip: true });

suite.test('suite - erroring this one (UI/manual test)', () => {
	throw new Error('intentional');
});

suite.test('suite - timing out this one (UI/manual test)', async t => {
	await t.waitInterval(1000);
}, { ttl: 500 });

suite.test('suite - failing this one (UI/manual test)', t => {
	t.assertNotEqual(1, 1);
});

suite.test('suite - all async', async test => {
	const s = getSuite('suite-under-test');

	s.test('t1', async t1 => { await t1.waitInterval(700); });
	s.test('t2', async t2 => { await t2.waitInterval(900); });

	await s.done;

	test.assertEqual(2, s.model.tests.length);
	test.assertTrue(s.model.time > 897);
});

suite.test('suite - all sync', async test => {
	const s = getSuite('suite-under-test');

	s.test('t1', async t1 => { await t1.waitInterval(700); }, { sync: true });
	s.test('t2', async t2 => { await t2.waitInterval(900); }, { sync: true });

	await s.done;

	test.assertEqual(2, s.model.tests.length);
	test.assertTrue(s.model.time > 1600);
});

suite.test('suite - API negative A', () => {
	getSuite();
}, { expectError: 'suite model MUST be a non-null object' });

//	this is the test to play with uncaughtrejection, just remove the return keyword from below
suite.test('suite - uncaught error from wrong asyns test', test => {
	return test.waitNextTask()
		.then(() => {
			throw new Error('wrongly done async test');
		});
}, { expectError: 'wrongly done async test' });