[![License GitHub](https://img.shields.io/github/license/gullerya/just-test.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/just-test.svg?label=npm)](https://www.npmjs.com/package/just-test)
[![Travis (.org) branch](https://img.shields.io/travis/gullerya/just-test/master.svg?logo=travis)](https://travis-ci.org/gullerya/just-test)
[![Codecov](https://img.shields.io/codecov/c/github/gullerya/just-test/master.svg)](https://codecov.io/gh/gullerya/just-test/branch/master)
[![Codacy](https://img.shields.io/codacy/grade/9aa34b1cf3c248fea0164e71137dce1c.svg?logo=codacy)](https://www.codacy.com/app/gullerya/just-test)

# Summary

`just-test` is a browser oriented tests runner strongly oriented to a __TDD__ of a client side libraries, frameworks and components.

Why would we have another one?
`just-test` is strongly oriented to dev real time process. It has actually began as a code running playground during my next framework development and from there evolved to be a tests runner.

The main point is to provide a shortest path for a developer to execute newly written code in the browser, re-run it while benefitting from the browser's debug tools, fix the source and re-test the whole again just in a click of refresh.

`just-test` became to myself a truly __TDD__ enabler as I'm using it in over a few dozens of libraries as of now. While being perfect tool for a librarires/components development, I'm still looking to see is and how could it be used to test a full web application.

#### Highlights:
- running tests in __browser__, no server needed, import/link your code (static files) and just test, literally __TDD__ oriented
- __re-running__ any test in browser ad-hoc - convenient for debugging and developing on the fly
- friendly __UI__ on top of the page of the tests, allows immediatelly observe the behavior of the code and the test
- running tests from __NodeJS__ via headless browser (currently: Chromium) to run in __CI/CD automation__
- generating __test results__ report (format: __xUnit__)
- collecting __coverage__ and generating report (formats: __lcov__)
- flexible yet simple ability to run tests in __sync__ as well as __async__ (default) manner
- in general, a lot of attention was paid to create __simple and usable__ framework even for a not-so-simple cases, like asynchronous tests etc

> Attention: the doc below is still in construction, more updates and detailed one will be published very soon!!!
> Meanwhile, the best way to actually see how the library should be used is it look onto its own tests in `tests` folder, and for CI/CD case - `travis.yml` is a good start.

# How it works - dev process

* start from writing a first lines of your next component or framework
* create a test file, `test.js` for example
* import into it the [`just-test` APIs](docs/api.md) and get the suite object by the __`getSuite`__ API
* import the stuff your are working on and write some testing code using suite's __`runTest`__ API
* create an empty `html` file, `test.html` for example
* import `test.js` into it and open it in browser

Congratulations! Your test/s are running.
You see the results organized in suites in the `just-test` UI.
You may re-run any test from the UI, see the errors if any, status, duration etc.

# CI readiness

`just-test` is not only a convenient work frame to develop and test the code at once, but also a CI automation ready tool.
Provided additional configuration file (full example may be seen [here](src/tests-runner/configuration/default-config.json)) `just-test` is able to:
* run your tests in CI in the following browsers: Chrome, Firefox (experimental); Edge Chromium will be added as soon as `puppeteer` platform will handle the download of the Edge's executable
* creates report in the following formats: `xUnit`
* creates coverage report in the following formats: `lcov`

# Examples

Typical usage of the JustTest would involve two steps:<br/>
<b>(A)</b> referring to the framework and the tests in your html page;<br/>
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

