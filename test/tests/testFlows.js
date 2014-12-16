(function () {

	var JT = window.Utils.JustTest, suite;

	suite = JT.createSuite({ name: 'Test sync/async assets' });

	suite.addTest({ name: 'running the flow', async: true }, function (pass, fail) {
		var tmpSute = JT.createSuite({ name: 'sub suite having tests flows' }), tmpPromise;

		tmpSute.addTest({ id: 0 }, function (pass, fail) {
			pass('this is passed');
		});

		tmpSute.addTest({ id: 1, name: 'not timing out' }, function (pass, fail) {
			setTimeout(pass, 3000);
		});

		tmpSute.addTest({ id: 2, name: 'to be skipped', skip: true }, function (pass, fail) {
			//	no matter what we have here
		});

		tmpSute.addTest({ id: 3, name: 'async - success', async: true }, function (pass, fail) {
			setTimeout(function () { pass('all good'); }, 7000);
		});

		tmpSute.addTest({ id: 4, name: 'async - success', async: true }, function (pass, fail) {
			setTimeout(function () { pass('all bad'); }, 6000);
		});

		tmpSute.addTest({ id: 5 }, function (pass, fail) {
			pass('this is passed');
		});

		tmpPromise = tmpSute.run();

		tmpPromise.then(function (report) {
			// TODO: verify timings in the reports and then pass
			pass();
		}, function (report) {
			fail(report);
		});
	});

	suite.run();
})();

