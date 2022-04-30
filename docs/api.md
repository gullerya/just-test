# API
`just-test` as a tests execution framework provides APIs on several levels:
- SDK APIs - imported and used in the actual tests code
- CLI - a set of convenience tools to be used from command line / CI
- REST APIs - provided by the server part of `just-test` and mostly used by the framework self, but also could be used for integrations etc

## SDK
SDK provides the code that is imported and used within the tests written by consumer.

For the clarity and convenience we split the structure into __Suites__ and __Tests__:
- tests always run within suite
- suite if the top-level formation (no suite within suite)
- some of the configuration can be set on suite level and unless overridden on the test level, will apply to all tests

> Whereever possible `just-test` attempts to follow NodeJS [native Test API](https://nodejs.org/api/test.html), that will be visible but should not be assumed.

### Suite API
`suite` is a top level entity (function) imported from the SDK and is a single entrypoint into the `just-test` harness.

```
import { suite } from 'just-test';

const suiteA = suite('Suite A', options);

suiteA.test('Test A', options, testContext => {

});

suiteA.addEventListener('done', doneCallback);
```

### Test API
TBD

## CLI
TODO: explain CLI command and options possible.

## REST
TODO: explain REST APIs.
