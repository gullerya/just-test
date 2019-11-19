import { createSuite } from '../dist/just-test.js';
import { Suite } from '../dist/suite.js';

const
	suite = createSuite({ name: 'Suite object APIs' });

suite.runTest({ name: 'suite - basic full flow' }, async test => {
	const s = new Suite({ name: 'suite-under-test' });

	s.runTest({ name: 't1' }, () => { });
	s.runTest({ name: 't2' }, () => { });

	await s.finished;

	test.assertEqual(2, s.tests.length);
	test.assertNotEqual(null, s.duration);
	test.assertTrue(s.duration > 0);
});