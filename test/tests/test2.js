(function () {
	
	var JT = window.Utils.JustTest, suite;

	suite = new JT.Suite({ name: 'sync/async tests mix, manual verification' });

	suite.addTest(function (pass, fail) {
		pass('this is passed');
	});

	suite.addTest({ name: 'not timing out' }, function (pass, fail) {
		setTimeout(pass, 3000);
	});

	suite.addTest({ name: 'to be skipped', skip: true }, function (pass, fail) {
		//	no matter what we have here
	});

	suite.addTest({ name: 'async - success', async: true }, function (pass, fail) {
		setTimeout(function () { pass('all good'); }, 7000);
	});

	suite.addTest({ name: 'async - success', async: true }, function (pass, fail) {
		setTimeout(function () { pass('all bad'); }, 6000);
	});

	suite.addTest({}, function (pass, fail) {
		pass('this is passed');
	});

	JT.run(suite);
})();

