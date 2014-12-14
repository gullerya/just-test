(function () {
	'use strict';

	var suite = window.Utils.JustTest.createSuite({ name: 'Suite object APIs' });

	suite.addTest({ name: 'JustTest namespace created okay' }, function (pass, fail) {
		if (typeof window.Utils.JustTest !== 'object') fail(new Error('JustTest namespace not exists'));
		if (typeof window.Utils.JustTest.createSuite !== 'function') fail(new Error('"createSuite" function not found'));
		pass();
	});

	//	TODO: add test for the complex initialization with customized options

	suite.run();
})();