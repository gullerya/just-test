import { createSuite } from '../dist/just-test.js';
import { Suite } from '../dist/suite.js';

const
	suite = createSuite({ name: 'Suite object APIs' });

suite.runTest({ name: 'suite - basic full flow' }, async test => {
	const s = new Suite({ name: 'suite-under-test' });

	s.runTest({ name: 't1' }, () => { });
	s.runTest({ name: 't2' }, () => { });

	await s.done;

	test.assertEqual(2, s.model.tests.length);
	test.assertNotEqual(null, s.model.duration);
	test.assertTrue(s.model.duration > 0);
});

suite.runTest({ name: 'suite - skipping this one (UI/manual test)', skip: true }, () => {
});

suite.runTest({ name: 'suite - erroring this one (UI/manual test)' }, () => {
	throw new Error('intentional');
});

suite.runTest({ name: 'suite - timing out this one (UI/manual test)', timeout: 500 }, async t => {
	await t.waitMillis(1000);
});

suite.runTest({ name: 'suite - failing this one (UI/manual test)' }, t => {
	t.assertNotEqual(1, 1);
});

suite.runTest({ name: 'suite - all async' }, async test => {
	const s = new Suite({ name: 'suite-under-test' });

	s.runTest({ name: 't1' }, async t1 => { await t1.waitMillis(700); });
	s.runTest({ name: 't2' }, async t2 => { await t2.waitMillis(900); });

	await s.done;

	test.assertEqual(2, s.model.tests.length);
	test.assertTrue(s.model.duration > 897);
});

suite.runTest({ name: 'suite - all sync' }, async test => {
	const s = new Suite({ name: 'suite-under-test' });

	s.runTest({ name: 't1', sync: true }, async t1 => { await t1.waitMillis(700); });
	s.runTest({ name: 't2', sync: true }, async t2 => { await t2.waitMillis(900); });

	await s.done;

	test.assertEqual(2, s.model.tests.length);
	test.assertTrue(s.model.duration > 1600);
});

suite.runTest({ name: 'suite - API negative A', expectError: 'suite model MUST be a non-null object' }, () => {
	new Suite();
});

suite.runTest({ name: 'suite - API negative B', expectError: 'suite model MUST be a non-null object' }, () => {
	new Suite('some non object');
});

suite.runTest({ name: 'suite - API negative C', expectError: 'name MUST be a non empty string' }, () => {
	new Suite({});
});