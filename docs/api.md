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

test('Test B - skipped', async () => {
	//	will not run
}, { skip: true });

test('Test C - custom timeout', async () => {
	//	runs with a 10s deadline
}, { timeout: 10000 });
```

Signature: `test(name, code, opts?)` — options always go last.

Options (all fields optional):
- `only: boolean` — when any test in the suite is `only`, only such tests run. Default `false`.
- `skip: boolean` — skip this test. Mutually exclusive with `only`. Default `false`.
- `timeout: number` — per-test deadline in milliseconds. Default `3000`.

## CLI

`local-runner` is the entrypoint used by CI: it starts the server in-process, runs the session, writes reports, and exits with a non-zero code on failure.

```
node ./bin/local-runner.js config_file=<path> [files=<pattern>]
```

| Arg | Required | Purpose |
|---|---|---|
| `config_file` | yes | Path to a config module (see `tests/_configs/*`). Loaded via dynamic `import`. |
| `files` | no | Strict override: replaces every environment's `tests.include` with this single entry (concrete path or glob) and clears `tests.exclude`. Use to run one file or a subset without editing a config. |

Reports are written to `reports/results-<env>.xml` (xUnit) and `reports/coverage-<env>.lcov` (lcov). The `<env>` suffix is derived from the environment — `nodejs`, `chromium-iframe`, `chromium-page`, `firefox-iframe`, `webkit-iframe`, `interactive` — so matrix configs do not overwrite each other.

## REST

The server exposes a REST contract used internally by session-boxes and the local-runner (sessions, environment metadata, result polling, coverage reporting). It is not a public integration surface. The authoritative wire shapes live in `src/server/api-contracts.ts`; consumers should go through `OrchestratorClient` (`src/server/orchestrator-client.ts`) rather than calling endpoints directly.
