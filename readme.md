[![License GitHub](https://img.shields.io/github/license/gullerya/just-test.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/just-test.svg?label=npm)](https://www.npmjs.com/package/just-test)
[![Travis (.org) branch](https://img.shields.io/travis/gullerya/just-test/master.svg?logo=travis)](https://travis-ci.org/gullerya/just-test)
[![Codecov](https://img.shields.io/codecov/c/github/gullerya/just-test/master.svg)](https://codecov.io/gh/gullerya/just-test/branch/master)
[![Codacy](https://img.shields.io/codacy/grade/9aa34b1cf3c248fea0164e71137dce1c.svg?logo=codacy)](https://www.codacy.com/app/gullerya/just-test)

# Summary

Test framework to run JavaScript (client) tests. Currently supports Chrome and Firefox (IE limitation due to lack of Promises support).<br/>
The main idea behind JustTest is having the client tests available within the development process (call it TDD, if you'd like to). The framework and the tests files are to be added directly to the webapp page. Each reload/refresh of the page will run the tests.<br/>
JustTest originally developed as a small'n'smart test framework for a personal needs (datatier-js), but I've decided to refactor it a bit and publish to the community as something useful, to my mind. Please feel free to comment, request, contribute.

#### Highlights:
- running tests in __browser__, most of the cases no server needed, just static files - dev time, literally __TDD__ oriented
- __re-running__ any test in browser ad-hoc - very cool for debugging
- friendly __UI__ on top of the page of the tests, allows immediatelly observe the behavior of the code and the test
- running tests from __NodeJS__ via headless browser (currently: Chromium) to run in __CI/CD automation__
- generating __test results__ report (format: __xUnit__)
- collecting __coverage__ and generating report (formats: __lcov__)
- flexible yet simple ability to run tests in __sync__ as well as __async__ (default) manner
- in general, a lot of attention was paid to create __simple and usable__ framework even for a not-so-simple cases, like asynchronous tests etc

> Attention: the doc below is still in construction, more updates and detailed one will be published very soon!!!
> Meanwhile, the best way to actually see how the library should be used is it look onto its own tests in `tests` folder, and for CI/CD case - `travis.yml` is a good start.

<b>Work process:</b><br/>
	a)	Write your app functionality (API),<br/>
	b)	Write test that uses/hits that functionality,<br/>
	c)	See the tests you've added within the browser.<br>
	d)	After finishing the active development phase tests invocation must obviously be removed from the sources, but you may want to keep them aside for an automation and/or regressions testing. Just rename your .html file with the tests before removing references to them.<br/>

<b>Advantages:</b><br/>
	a)	You're immediatelly experiment with the functional aspect of an app actually using your APIs/logic,<br/>
	b)	The implementation is being tested immediatelly as well,<br/>
	c)	Tests, if left intact, are becoming regression tests on later stage,<br/>
	d)	Running the tests while running the application brings them closer to reality,<br/>
	e)	The dev process becomes more efficient: no need to setup test env (unless automation used), no need to invest in separate process of running tests: running app is running the tests as well.<br/>

<b>Disadvantages:</b><br/>
	a)	References to tests and the framework mixed inside the production code (future feature of configuration by config.js will lower this to one reference only)
	b)	No reports persisted (two features are planned to handle this: (i) API to post the results to the specified URL [formats of XML_JUnit, XML_TestNG, XML_NUnit as well as JSON_JustTest, XML_JustTest are meant to be provided out of the box, as well as API to register custom format])
	c)	Currently tests files must be explicitly specified (either in .html or in config.js) which becomes inconvenient with dozens of files. There probably will be a server-side part supplied in a (distant :)) future to provider fully functioning test execution with Selenium-like approach.

# Concepts

1) The grouping unit is Suite,<br/>
2) Any number of suites can be created and run. Suite is a logical entity, you can have create many suites in one file and you can use one suite from different files,<br/>
3) Tests are being created within a Suite,<br/>
4) Any number of test can populate any suite,<br/>
5) Tests are ALL handled internally in async way. Yet, you can opt to RUN test in sync or async flow: sync means next test will not be running untill the current one is not done, async means that next test will start parallelly. Default is sync,<br/>
6) Tests are actually a functions of test logic provided with two parameters: pass callback and fail callback. You can provide custom message for any of them while in case of fail it's advised to make a message as an Error (see examples),<br/>
7) Suites are meant to be run via the JustSest API and not directly, then they'll appear in the UI and will run sequentally.<br/>

# Status

The project under development right now. TODO list:<br/>
1) add more tests for internal functionality, cover tests flows, sync and async,<br/>
2) some UI extensions, like summary for all of the Suites ran,<br/>
3) add support for beforeSuite/afterSuite, beforeTest/afterTest functionality,<br/>
4) add exporting functionality, formats currently in the list: JSON, xmlJUnit, xmlTestNG,<br/>
5) add UI elements id conventions in order to support Selenium-like automations,<br/>
6) possibly add configuration via config.js file (having tests files stated there and not in index.html),<br/>
7) possibly add WebSocket based connectivity/API enabling remote execution/reporting.<br/>

# Examples

Typical usage of the JustTest would involve two steps:<br/>
<b>(A)</b> referring to the freamework and the tests in your html page;<br/>
<b>(B)</b> writing the actual test logic using an API (look example below and APIs).<br/>
<br/>
<b>index.html</b>
```
<body>
	...
	<script src="just-test.js"></script>
	<script src="test1.js"></script>
	<script src="test2.js"></script>
</body>
```

<b>test1.js</b>
```
(function() {
	'use strict';

	var JT = window.Utils.JustTest, suite;

	suite = JT.createSuite({ name: 'Suite object APIs' });

	suite.addTest({						//	options list described in API section below
		name: 'JustTest namespace created okay'
	}, function (pass, fail) {
		if ('your internal validation logic fails') fail(new Error('error notice'));
		if ('another fail') throw new Error('calling "fail" and throwing have the same effect');
		pass();
	});
	
	suite.run();
})();
```

<b>test2.js</b>
```
(function() {
	'use strict';

	var JT = window.Utils.JustTest, suite;
	
	suite = JT.createSuite();

	suite.addTest(function (pass, fail) {		//	can skip the options, defaults will be used
		...
	});
	
	suite.run();
})();
```

# API

<b>Framework</b> object (default ```window.Utils.JustTest```):


<b>Test</b> (```JustTest.Test```):


<b>Suite</b> (```JustTest.Suite```):

