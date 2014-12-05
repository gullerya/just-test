(function () {
	'use strict';

	var suite = window.Utils.JustTest.createSuite({
		name: 'testing the objects'
	});

	suite.createTest(function (pass, fail) {
		pass('this is passed');
	});

	suite.createTest({ description: 'timing out' }, function (pass, fail) {
		//	timeout should happen here
		setTimeout(function () { fail(new Error('keep thowing with Error to get the stacktrace')); }, 8000);
	});

	suite.createTest({ description: 'to be skipped', skip: true }, function (pass, fail) {
		//	no matter what we have here
	});

	suite.createTest({ description: 'async - success', async: true }, function (pass, fail) {
		setTimeout(function () { pass('all good'); }, 7000);
	});

	suite.createTest({ description: 'async - failure', async: true }, function (pass, fail) {
		setTimeout(function () { fail(new Error('all bad')); }, 6000);
	});

	suite.createTest({ description: 'throwing' }, function (pass, fail) {
		throw new Error('some error');
	});

	suite.createTest({}, function (pass, fail) {
		fail(new Error('this is failed'));
	});

	suite.run();
})();