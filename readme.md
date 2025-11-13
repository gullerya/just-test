[![npm version](https://img.shields.io/npm/v/@gullerya/just-test.svg?label=npm)](https://www.npmjs.com/package/@gullerya/just-test)
[![License GitHub](https://img.shields.io/github/license/gullerya/just-test.svg)](https://opensource.org/licenses/MIT)

[![Quality pipeline](https://github.com/gullerya/just-test/actions/workflows/quality.yml/badge.svg?branch=main)](https://github.com/gullerya/just-test/actions/workflows/quality.yml)
[![Codecov](https://codecov.io/gh/gullerya/just-test/branch/main/graph/badge.svg?token=gq1k48NawB)](https://codecov.io/gh/gullerya/just-test)

[![Codacy](https://img.shields.io/codacy/grade/9aa34b1cf3c248fea0164e71137dce1c.svg?logo=codacy)](https://www.codacy.com/app/gullerya/just-test)

# Summary

`just-test` is an all JS platforms oriented test runner strongly opinionated about testing practices, libraries, frameworks and components.

TODO

#### Highlights:

- running tests in __browser__, no server needed, import/link your code (static files) and just test, literally __TDD__ oriented
- __re-running__ any test in browser ad-hoc - convenient for debugging and developing on the fly
- friendly __UI__ on top of the page of the tests, allows immediatelly observe the behavior of the code and the test
- running tests from __NodeJS__ via headless browser (chromium, firefox, webkit) to run in __CI/CD automation__
- generating __test results__ report (types: __xUnit__)
- collecting __coverage__ and generating report (types: __lcov__)
- flexible yet simple ability to run tests in __sync__ as well as __async__ (default) manner
- in general, a lot of attention was paid to create __simple and usable__ framework even for a not-so-simple cases, like asynchronous tests etc

> Attention: the doc below is still in construction, more updates and detailed one will be published very soon!!!
> Meanwhile, the best way to actually see how the library should be used is it look onto its own tests in `tests` folder, and for CI/CD case - `travis.yml` is a good start.

# CI readiness

TODO - move to features
* run your tests in CI in the following browsers: Chromium (covering all based upon), Firefox, WebKit
* test report types: `xUnit`
* coverage report types: `lcov`

# Examples

TODO

# API

TODO