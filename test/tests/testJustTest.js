(function () {
	'use strict';

	var suite = window.Utils.JustTest.createSuite({ name: 'Suite object APIs' }),
		customNamespace = {};

	suite.addTest({ name: 'JustTest namespace created okay' }, function (pass, fail) {
		if (typeof window.Utils.JustTest !== 'object') fail(new Error('JustTest namespace not exists'));
		if (typeof window.Utils.JustTest.createSuite !== 'function') fail(new Error('"createSuite" function not found'));
		if (typeof window.Utils.JustTest.View !== 'object') fail(new Error('JustTest.View object not exists'));
		pass();
	});

	suite.addTest({ name: 'JustTest customly loaded', async: true }, function (pass, fail) {
		var xhr = new XMLHttpRequest();
		xhr.open('get', '../src/just-test.js');
		xhr.onload = function () {
			if (xhr.status === 200) {
				(new Function(xhr.responseText))({
					namespace: customNamespace
				});
				if (typeof customNamespace.JustTest !== 'object') fail(new Error('failed to init in custom namespace'));
				if (typeof customNamespace.JustTest.createSuite !== 'function') fail(new Error('"createSuite" function not found in custom namespace'));
				if (typeof customNamespace.JustTest.View !== 'object') fail(new Error('JustTest.View object not exists'));
				if (typeof customNamespace.JustTest.View.ui !== 'object') fail(new Error('JustTest.View.ui object not exists'));
				document.body.removeChild(customNamespace.JustTest.View.ui);
				customNamespace = null;
				pass();
			} else { console.error(xhr.status); fail(new Error()); }
		};
		xhr.onerror = function () {
			console.error('error while requesting the sources');
			fail(new Error());
		};
		xhr.send();
	});

	suite.addTest({ name: 'test utils parameter' }, function (pass, fail, utils) {
		if (!utils) fail(new Error('"utils" parameter expected to be defined'));
		if (!utils.assert) fail(new Error('"utils.assert" property expected to be defined'));
		if (!utils.assert.equal) fail(new Error('"utils.assert.equal" property expected to be defined'));
		if (!utils.assert.striqual) fail(new Error('"utils.assert.srtiqual" property expected to be defined'));
		utils.assert.equal(5, 5);
		utils.assert.striqual(5, 5);
		utils.assert.equal('5', 5);
		pass();
	});

	suite.run();
})();