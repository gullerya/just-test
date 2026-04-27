# API
`just-test` as a tests execution framework provides APIs on several levels:
- SDK APIs - imported and used in the actual tests code
- CLI - a set of convenience tools to be used from command line / CI
- REST APIs - provided by the server part of `just-test` and mostly used by the framework self, but also could be used for integrations etc

## SDK
SDK provides the code that is imported and used within the tests written by consumer.

Each test file is a __Suite__ — `just-test` treats the file itself as the grouping unit. A file contains one or more `test()` declarations; there is no separate suite-declaration API.

> Whereever possible `just-test` attempts to follow NodeJS [native Test API](https://nodejs.org/api/test.html), that will be visible but should not be assumed.

### Test API
`test` is the single entrypoint into the `just-test` harness.

```js
import { test } from '@gullerya/just-test';
import { assert } from '@gullerya/just-test/assert';

test('Test A', async () => {
	//	actual test code goes here
	assert.strictEqual(1 + 1, 2);
});

test('Test B - skipped', { skip: true }, async () => {
	//	will not run
});

test('Test C - custom timeout', { timeout: 10000 }, async () => {
	//	runs with a 10s deadline
});
```

Options (all fields optional):
- `only: boolean` — when any test in the suite is `only`, only such tests run. Default `false`.
- `skip: boolean` — skip this test. Mutually exclusive with `only`. Default `false`.
- `timeout: number` — per-test deadline in milliseconds. Default `3000`.

## CLI
TODO: explain CLI command and options possible.

## REST
TODO: explain REST APIs.
