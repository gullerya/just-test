JustTest
========

Test framework to run JavaScript (client) tests. Currently supports Chrome and Firefox (IE will work once Promises will be supported natively)

Status
======

The project under active development right now. TODO list:
1) add more tests for internal functionality, cover tests flows, sync and async
2) some UI extensions, like summary for all of the Suites ran
3) add support for beforeSuite/afterSuite, beforeTest/afterTest functionality
4) add exporting functionality, formats currently in the list: JSON, xmlJUnit, xmlTestNG
5) add UI elements id conventions in order to support Selenium-like automations

Concepts
========

1) The grouping unit is Suite. This is the base entity one will work with: adding tests to it, running and generating reporting.
2) Any number of suites can be created and run. Suite is a logical entity, you can have create many suites in one file and you can use one suite from different files.
3) Tests are being created within a Suite.
4) Any number of test can populate any suite.
5) Tests are ALL handled internally in async way. Yet, you can opt to RUN test in sync or async flow: sync means next test will not be running untill the current one is not done, async means that next test will start parallelly. Default is sync.
6) Tests are actually a functions of test logic provided with two parameters: pass callback and fail callback. You can provide custom message for any of them while in case of fail it's advised to make a message as an Error (see examples).
7) Suites are meant to be run via the JustSest API and not directly, then they'll appear in the UI and will run sequentally.

API
===

Examples
========
