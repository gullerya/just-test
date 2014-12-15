(function () {
	'use strict';

	var suite = window.Utils.JustTest.createSuite({ name: 'Suite object APIs' }),
		customNamespace = {};

	suite.addTest({ name: 'JustTest namespace created okay' }, function (pass, fail) {
		if (typeof window.Utils.JustTest !== 'object') fail(new Error('JustTest namespace not exists'));
		if (typeof window.Utils.JustTest.createSuite !== 'function') fail(new Error('"createSuite" function not found'));
		if (typeof window.Utils.JustTest.View !== 'object') fail(new Error('JustTest.View object not exists'));
		if (typeof window.Utils.JustTest.View.maximize !== 'function') fail(new Error('JustTest.View.maximize function not exists'));
		if (typeof window.Utils.JustTest.View.minimize !== 'function') fail(new Error('JustTest.View.minimize function not exists'));
		if (window.Utils.JustTest.View.element.nodeName !== 'DIV') fail(new Error('JustTest.View.element object not created properly'));
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
				if (typeof customNamespace.JustTest.View.maximize !== 'function') fail(new Error('JustTest.View.maximize function not exists'));
				if (typeof customNamespace.JustTest.View.minimize !== 'function') fail(new Error('JustTest.View.minimize function not exists'));
				if (customNamespace.JustTest.View.element.nodeName !== 'DIV') fail(new Error('JustTest.View.element object not created properly'));
				customNamespace.JustTest.View.element.parentNode.removeChild(customNamespace.JustTest.View.element);
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

	suite.run();
})();