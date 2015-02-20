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

		tmpSute.addTest({ id: 4, name: 'async - fail', async: true }, function (pass, fail) {
			setTimeout(function () { fail('this should fail after 6s and not on timeout!'); }, 6000);
		});

		tmpSute.addTest({ id: 5 }, function (pass, fail) {
			pass('this is passed');
		});

		tmpPromise = tmpSute.run();

		tmpPromise.then(function () {
			var tests = tmpSute.getTests();
			if (tests[1].duration < 3000) fail(new Error('expected test to last at least 3000ms'));
			if (tests[2].startTime < tests[1].startTime + 3000) fail(new Error('expected test 2 to start after full finish of test 1'));
			if (tests[3].startTime > tests[4].startTime || tests[4].startTime > tests[5].startTime) fail(new Error('expected tests to start in sequence'));
			if (tests[3].startTime + tests[3].duration > tests[4].startTime) fail(new Error('expected tests 3 and 4 to run in parallel'));
			if (tests[4].startTime + tests[4].duration > tests[5].startTime) fail(new Error('expected tests 4 and 5 to run in parallel'));
			pass();
		}, function () {
			fail();
		});
	});

	suite.run();
})();
