import { createSuite } from '../dist/just-test.js';

const
	suite = createSuite({ name: 'Suite object APIs' });

suite.addTest({ name: 'Suite object created (no options)' }, test => {
	const tmpSuite = createSuite();
	if (!tmpSuite) test.fail(new Error('failed to create suite object'));
	if (tmpSuite.name !== 'nameless') test.fail(new Error('name expected to be equal "nameless" when not explicitly stated'));
	if (typeof tmpSuite.addTest !== 'function') test.fail(new Error('addTest function not found'));
	if (typeof tmpSuite.run !== 'function') test.fail(new Error('run function not found'));
	test.pass();
});

suite.addTest({ name: 'Suite object created (with options)' }, test => {
	const tmpSuite = createSuite({ name: 'name' });
	if (tmpSuite.name !== 'name') test.fail(new Error('name expected to be equal "name"'));
	test.pass();
});

//	TODO: add tests for the suite run, timings result

//	TODO: add tests for different compositions of sync/async tests

suite.run();
