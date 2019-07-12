import { createSuite } from '../../dist/just-test.js';

const
	suite = createSuite({ name: 'Suite object APIs' });

suite.addTest({ name: 'Suite object created (no options)' }, test => {
	const tmpSuite = createSuite();
	if (!tmpSuite) test.fail(new Error('failed to create suite object'));
	if (tmpSuite.constructor.name !== 'Suite') test.fail(new Error('suite object of wrong type: expected Suite, received ' + tmpSuite.constructor.name));
	if (typeof tmpSuite.id !== 'undefined') test.fail(new Error('id expected to be undefined when not explicitly stated'));
	if (tmpSuite.name !== 'unnamed') test.fail(new Error('name expected to be equal empty string when not explicitly stated'));
	if (tmpSuite.view.nodeType !== Node.ELEMENT_NODE) test.fail(new Error('suite failed to create view element'));
	if (typeof tmpSuite.addTest !== 'function') test.fail(new Error('addTest function not found'));
	if (typeof tmpSuite.run !== 'function') test.fail(new Error('run function not found'));
	test.pass();
});

suite.addTest({ name: 'Suite object created (with options)' }, test => {
	tmpSuite = createSuite({ name: 'name' });
	if (tmpSuite.name !== 'name') test.fail(new Error('name expected to be equal "name"'));
	test.pass();
});

suite.addTest({ name: 'Suite object created (properties should be immutable)' }, test => {
	var tmpFunc = function () { };
	tmpSuite = createSuite({ name: 'name' });
	try {
		tmpSuite.id = 'some_new_id';
		test.fail(new Error('flow should not get here'));
	} catch (e) {
		if (tmpSuite.id !== 'id') test.fail(new Error('id property should be immutable'));
		if (e instanceof TypeError); else test.fail(new Error('TypeError expected to happen'));
	}
	try {
		tmpSuite.name = 'some_new_name';
		test.fail(new Error('flow should not get here'));
	} catch (e) {
		if (tmpSuite.name !== 'name') test.fail(new Error('name property should be immutable'));
		if (e instanceof TypeError); else test.fail(new Error('TypeError expected to happen'));
	}
	try {
		tmpSuite.addTest = tmpFunc;
		test.fail(new Error('flow should not get here'));
	} catch (e) {
		if (tmpSuite.addTest === tmpFunc) test.fail(new Error('addTest function should not have been replaced'));
		if (e instanceof TypeError); else test.fail(new Error('TypeError expected to happen'));
	}
	test.pass();
});

//	TODO: add tests for the suite run, timings result

//	TODO: add tests for different compositions of sync/async tests

suite.run();
