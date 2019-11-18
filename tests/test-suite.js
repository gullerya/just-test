import { createSuite } from '../dist/just-test.js?minimized=true';

const
	suite = createSuite({ name: 'Suite object APIs' });

suite.runTest({ name: 'Suite object created (no options)' }, test => {
	const tmpSuite = createSuite();

	test.assertTrue(Boolean(tmpSuite));
	test.assertEqual(tmpSuite.name, 'nameless');
	test.assertEqual(typeof tmpSuite.runTest, 'function');
});

suite.runTest({ name: 'Suite object created (with options)' }, test => {
	const tmpSuite = createSuite({ name: 'name' });

	test.assertEqual(tmpSuite.name, 'name');
});