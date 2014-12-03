(function () {
	'use strict';

	var suite = window.Utils.JustTest.createSuite({
		name: 'testing the flows'
	});

	suite.createCase(function (pass, fail) {
		pass('this is passed');
	});

	suite.createCase({ description: 'not timing out' }, function (pass, fail) {
		setTimeout(pass, 3000);
	});

	suite.createCase({ description: 'to be skipped', skip: true }, function (pass, fail) {
		//	no matter what we have here
	});

	suite.createCase({ description: 'async - success', async: true }, function (pass, fail) {
		setTimeout(function () { pass('all good'); }, 7000);
	});

	suite.createCase({ description: 'async - success', async: true }, function (pass, fail) {
		setTimeout(function () { pass('all bad'); }, 6000);
	});

	suite.createCase({}, function (pass, fail) {
		pass('this is passed');
	});

	suite.run();
})();