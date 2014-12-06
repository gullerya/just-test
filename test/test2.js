(function () {
	'use strict';

	var JT = window.Utils.JustTest, suite = new JT.Suite({
		name: 'testing the flows'
	});

	suite.addTest(function (pass, fail) {
		pass('this is passed');
	});

	suite.addTest({ description: 'not timing out' }, function (pass, fail) {
		setTimeout(pass, 3000);
	});

	suite.addTest({ description: 'to be skipped', skip: true }, function (pass, fail) {
		//	no matter what we have here
	});

	suite.addTest({ description: 'async - success', async: true }, function (pass, fail) {
		setTimeout(function () { pass('all good'); }, 7000);
	});

	suite.addTest({ description: 'async - success', async: true }, function (pass, fail) {
		setTimeout(function () { pass('all bad'); }, 6000);
	});

	suite.addTest({}, function (pass, fail) {
		pass('this is passed');
	});

	JT.run(suite);
})();