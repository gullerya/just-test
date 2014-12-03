(function () {
	'use strict';

	var suite = window.Utils.JustTest.createSuite({
		name: 'testing the flows'
	});

	suite.createCase(function (pass, fail) {
		pass('this is passed');
	});

	suite.createCase({ description: 'timing out' }, function (pass, fail) {
		//	timeout should happen here
	});

	suite.createCase({ description: 'to be skipped', skip: true }, function (pass, fail) {
		//	no matter what we have here
	});

	suite.createCase({ description: 'async - success', async: true }, function (pass, fail) {
		setTimeout(function () { pass('all good'); }, 7000);
	});

	suite.createCase({ description: 'async - failure', async: true }, function (pass, fail) {
		setTimeout(function () { fail('all bad'); }, 6000);
	});

	suite.createCase({ description: 'throwing' }, function (pass, fail) {
		throw new Error('some error');
	});

	suite.createCase({}, function (pass, fail) {
		fail('this is failed');
	});

	suite.run();
})();