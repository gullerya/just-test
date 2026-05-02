[![npm version](https://img.shields.io/npm/v/@gullerya/just-test.svg?label=npm)](https://www.npmjs.com/package/@gullerya/just-test)
[![License GitHub](https://img.shields.io/github/license/gullerya/just-test.svg)](https://opensource.org/licenses/MIT)

[![Quality pipeline](https://github.com/gullerya/just-test/actions/workflows/quality.yml/badge.svg?branch=main)](https://github.com/gullerya/just-test/actions/workflows/quality.yml)
[![Codecov](https://codecov.io/gh/gullerya/just-test/branch/main/graph/badge.svg?token=gq1k48NawB)](https://codecov.io/gh/gullerya/just-test)

# just-test

`just-test` is a one-stop-shop library to test JS/TS code in Node and browsers with a uniform, zero-touch-per-environment syntax — the same `test()` you write once runs everywhere, with no environment-specific wrappers.

## Features

- **Runs in Node** (worker threads) and in all three major browser engines driven by **Playwright**: Chromium, Firefox, WebKit.
- **Three browser executor modes**: `iframe` (default, cheap), `page` (per-test page — true per-test coverage), `worker` (Web Worker).
- **Per-test isolation** across every mode.
- **Coverage** out of the box (V8 → `lcov`), per-test where the mode allows it, session-global where it doesn't.
- **Test reporting** in `xUnit`.
- **Selective runs**: `{ skip }`, `{ only }`, and a `files=<pattern>` CLI override to run a single file or glob without editing a config.
- **One assertion library** (`@gullerya/just-test/assert`) shared across every environment.

## Install

```bash
npm install --save-dev @gullerya/just-test
```

## Write a test

```ts
import { test } from '@gullerya/just-test';
import { assert } from '@gullerya/just-test/assert';

test('adds', () => {
	assert.strictEqual(1 + 1, 2);
});

test('async work', async () => {
	const v = await Promise.resolve(42);
	assert.strictEqual(v, 42);
});

test('skip me', () => { }, { skip: true });

test('only me', () => { }, { only: true });

test('custom timeout', async () => { }, { timeout: 10000 });
```

A **file is a suite**. There is no `suite()` / `describe()` wrapper.

## Run

`just-test` uses a small config module per environment, consumed by a CLI.

**Node:**

```ts
// tests-config-nodejs.ts
export default {
	environments: [{
		node: true,
		tests:    { include: ['./tests/**/*-test.ts'] },
		coverage: { include: ['./src/**/*'] }
	}]
};
```

**Browser (Chromium, iframe executor):**

```ts
// tests-config-chromium.ts
export default {
	environments: [{
		browser:  { type: 'chromium', executors: { type: 'iframe' } },
		tests:    { include: ['./tests/**/*-test.ts'] },
		coverage: { include: ['./src/**/*'] }
	}]
};
```

Swap `type: 'chromium'` for `'firefox'` or `'webkit'`, and `executors.type` for `'iframe'` / `'page'` / `'worker'`.

Invoke:

```bash
node ./node_modules/.bin/local-runner config_file=./tests-config-nodejs.ts
node ./node_modules/.bin/local-runner config_file=./tests-config-chromium.ts

# run a subset without editing the config
node ./node_modules/.bin/local-runner \
  config_file=./tests-config-nodejs.ts \
  files='./tests/common/**/*-test.ts'
```

Reports land in `reports/results-<env>.xml` and `reports/coverage-<env>.lcov`, where `<env>` is derived from the environment (e.g. `nodejs`, `chromium-iframe`, `firefox-iframe`). Matrix runs do not overwrite each other.

## Executor modes — trade-offs

| Mode | What it does | Coverage attribution |
|---|---|---|
| `iframe` *(default)* | Each test in its own iframe on a shared page. | Session-global (iframes share V8 with the host page). |
| `page` | Each test in its own Playwright page. | **Per-test.** |
| `worker` | Each test in its own Web Worker. | Not collected (workers are out of V8 coverage's reach). |

Node uses `worker_thread`s and collects per-test coverage via the Inspector directly.

## CI readiness

- Matrix across Node, Chromium, Firefox, WebKit — run each as its own job.
- `xUnit` xml and `lcov` artifacts are env-suffixed; upload them to Codecov or similar.
- Non-zero exit on failure; `maxFail` / `maxSkip` are configurable gates.

## Docs

- [API](docs/api.md) — `test()` options, CLI flags, REST pointer.
- [Architecture](docs/architecture.md) — backend + sandbox split, coverage pipeline, public API, dogfooding.
- [Feature gaps](docs/feature-gaps.md) — what's missing and where it hurts.
- [Changelog](CHANGELOG.md)

## License

[MIT](license)
