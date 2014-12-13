JustTest
========

Test framework to run JavaScript (client) tests. Currently supports Chrome and Firefox (IE will work once Promises will be supported natively).<br/>
The main idea behind JustTest is having the client tests immediatelly available during the development process, call it TDD, if you'd like to.<br/>
Thus, the framework and the tests files are to be added directly to the webapp page. Each reload/refresh of the page will run the tests.<br/>

<b>Work process:</b><br/>
	a)	Write functionality (API)<br/>
	b)	Write test that uses/hits that functionality<br/>
	c)	Refresh the browser :)<br>
	d)	After finishing the active development phase tests invocation must be removed (easily) from the sources, but may stay for an automation and/or regressions testing<br/>

<b>Advantages:</b><br/>
	a)	You're immediatelly experiment with the functional aspect of an app actually using your APIs/logic<br/>
	b)	The implementation is being tested immediatelly as well<br/>
	c)	Those test, if left intact, are becoming regression tests<br/>
	d)	Running the tests while running the application brings them closer to reality<br/>
	e)	The dev process becomes more efficient: no need to setup test env (unless automation used), no need to invest in separate process of running tests: running app is running the tests as well<br/>

Concepts
========

1) The grouping unit is Suite.
2) Any number of suites can be created and run. Suite is a logical entity, you can have create many suites in one file and you can use one suite from different files.
3) Tests are being created within a Suite.
4) Any number of test can populate any suite.
5) Tests are ALL handled internally in async way. Yet, you can opt to RUN test in sync or async flow: sync means next test will not be running untill the current one is not done, async means that next test will start parallelly. Default is sync.
6) Tests are actually a functions of test logic provided with two parameters: pass callback and fail callback. You can provide custom message for any of them while in case of fail it's advised to make a message as an Error (see examples).
7) Suites are meant to be run via the JustSest API and not directly, then they'll appear in the UI and will run sequentally.

Status
======

The project under development right now. TODO list:
1) add more tests for internal functionality, cover tests flows, sync and async
2) some UI extensions, like summary for all of the Suites ran
3) add support for beforeSuite/afterSuite, beforeTest/afterTest functionality
4) add exporting functionality, formats currently in the list: JSON, xmlJUnit, xmlTestNG
5) add UI elements id conventions in order to support Selenium-like automations
6) possibly add configuration via config.js file (having tests files stated there and not in index.html)
7) possibly add WebSocket based connectivity/API enabling remote execution/reporting

Examples
========

Typical usage of the JustTest would involve two steps:<br/>
<b>(A)</b> referring to the freamework and the tests in your html page;<br/>
<b>(B)</b> writing the actual test logic using an API (look example below and APIs).<br/>
<br/>
<b>index.html</b>
<code>
	<body>
		...
		<script src="just-test.js"></script>
		<script src="test1.js"></script>
		<script src="test2.js"></script>
	</body>
</code>

API
===
