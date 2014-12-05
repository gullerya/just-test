(function () {
	'use strict';

	var suite = window.Utils.JustTest.createSuite({
		name: 'testing the flows'
	});

	suite.createTest(function (pass, fail) {
		pass('this is passed');
	});

	suite.createTest({ description: 'not timing out' }, function (pass, fail) {
		setTimeout(pass, 3000);
	});

	suite.createTest({ description: 'to be skipped', skip: true }, function (pass, fail) {
		//	no matter what we have here
	});

	suite.createTest({ description: 'async - success', async: true }, function (pass, fail) {
		setTimeout(function () { pass('all good'); }, 7000);
	});

	suite.createTest({ description: 'async - success', async: true }, function (pass, fail) {
		setTimeout(function () { pass('all bad'); }, 6000);
	});

	suite.createTest({}, function (pass, fail) {
		pass('this is passed');
	});

	suite.run();
})();