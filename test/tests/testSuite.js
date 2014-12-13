(function () {
	'use strict';

	var JT = window.Utils.JustTest, suite, tmpSuite;

	suite = JT.createSuite({ name: 'Suite object APIs' });

	suite.addTest({ name: 'Suite object created (no options)' }, function (pass, fail) {
		tmpSuite = JT.createSuite({ hidden: true });
		if (!tmpSuite) fail(new Error('failed to create suite object'));
		if (tmpSuite.constructor.name !== 'Suite') fail(new Error('suite object of wrong type: expected Suite, received ' + tmpSuite.constructor.name));
		if (typeof tmpSuite.id !== 'undefined') fail(new Error('id expected to be undefined when not explicitly stated'));
		if (tmpSuite.name !== 'unnamed') fail(new Error('name expected to be equal empty string when not explicitly stated'));
		if (tmpSuite.view.nodeType !== Node.ELEMENT_NODE) fail(new Error('suite failed to create view element'));
		if (typeof tmpSuite.addTest !== 'function') fail(new Error('addTest function not found'));
		if (typeof tmpSuite.run !== 'function') fail(new Error('run function not found'));
		pass();
	});

	suite.addTest({ name: 'Suite object created (with options)' }, function (pass, fail) {
		tmpSuite = JT.createSuite({ id: 'id', name: 'name', hidden: true });
		if (tmpSuite.id !== 'id') fail(new Error('id expected to be equal "id"'));
		if (tmpSuite.name !== 'name') fail(new Error('name expected to be equal "name"'));
		pass();
	});

	suite.addTest({ name: 'Suite object created (properties should be immutable)' }, function (pass, fail) {
		var tmpFunc = function () { };
		tmpSuite = JT.createSuite({ id: 'id', name: 'name', hidden: true });
		try {
			tmpSuite.id = 'some_new_id';
			fail(new Error('flow should not get here'));
		} catch (e) {
			if (tmpSuite.id !== 'id') fail(new Error('id property should be immutable'));
			if (e instanceof TypeError); else fail(new Error('TypeError expected to happen'));
		}
		try {
			tmpSuite.name = 'some_new_name';
			fail(new Error('flow should not get here'));
		} catch (e) {
			if (tmpSuite.name !== 'name') fail(new Error('name property should be immutable'));
			if (e instanceof TypeError); else fail(new Error('TypeError expected to happen'));
		}
		try {
			tmpSuite.addTest = tmpFunc;
			fail(new Error('flow should not get here'));
		} catch (e) {
			if (tmpSuite.addTest === tmpFunc) fail(new Error('addTest function should not have been replaced'));
			if (e instanceof TypeError); else fail(new Error('TypeError expected to happen'));
		}
		pass();
	});

	//	TODO: add tests for the suite run, timings result

	//	TODO: add tests for different compositions of sync/async tests

	suite.run();
})();