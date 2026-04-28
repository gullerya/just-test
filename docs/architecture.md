# Architecture

`just-test` is a **backend + sandbox** test harness. A Node backend orchestrates sessions and serves assets; tests execute inside sandboxes (Node worker threads, browser pages/iframes/workers, or an interactive browser tab) and report back through one REST contract. Result and coverage shapes are identical regardless of where the test ran.

---

## 1. Layers

```mermaid
graph TB
	subgraph Backend[Backend · Node only]
		HTTP[HTTP server + handlers<br/>server/*]
		SES[Session service<br/>server/sessions/*]
		ENV[Env services<br/>server/environments/*]
		REP[Reporters<br/>coverage/reporters, testing/reporters]
	end
	subgraph Sandbox[Sandbox runtime]
		API[Public API<br/>runner/just-test.js]
		SBX[session-box + test-box<br/>runner/environments/*]
	end
	subgraph Core[Shared core]
		MDL[Models · constants · utils<br/>common/*, testing/model/*, coverage/model/*, coverage/converters/*]
	end

	HTTP --> SES --> ENV
	ENV -. spawns .-> Sandbox
	Sandbox -. REST .-> HTTP
	Sandbox --> Core
	Backend --> Core
```

- **Shared core** runs identically on backend and in every sandbox. This is the foundation of the uniform-report-shape invariant.
- **Backend** orchestrates, owns HTTP, synthesizes final reports.
- **Env services** bridge backend to sandbox: Playwright for browsers, `worker_thread` for Node, URL-only for interactive.
- **Sandbox runtime** (`src/runner`) runs inside whichever executor was spawned. `runner/just-test.js` is the public `test()` API.
- **UI** (`src/ui`) is interactive-only and plays no role in automated runs.

## 2. Entry points

| Entry | Purpose |
|---|---|
| `local-runner.ts` | CLI: starts server in-process, posts config, polls `/result`, writes `reports/results.xml` + `reports/coverage.lcov`, exits. |
| `server/cli.ts` | Starts the server only. Interactive: a human opens the logged session URL. |

Both accept `key=value` CLI arguments merged over the loaded config. `src/configurer.js` is dead code — delete pending.

---

## 3. Session lifecycle

```mermaid
sequenceDiagram
	participant CLI as local-runner
	participant API as api-handler
	participant SES as sessions-service
	participant ENV as env-service
	participant SB as sandbox
	participant TB as test-box

	CLI->>API: POST /api/v1/sessions
	API->>SES: addSession
	SES->>ENV: launch
	ENV->>SB: boot (navigate / spawn)
	SB->>API: GET /metadata
	SB->>SB: plan (import each file in PLAN mode)
	loop per test
		SB->>TB: dispatch (iframe / page / worker)
		TB->>TB: run in TEST mode
		TB-->>SB: TestRun
	end
	SB->>API: POST /result (includes coverage)
	API->>SES: storeResult → dismiss env → resultReady = true
	CLI->>API: GET /result (polls)
```

Per-test coverage rides **inside** `envResult` — no side-channel artifact merge. The `/result` endpoint returns 204 until `resultReady` flips.

Multi-env session finalization is not merged: today the last-reporting env overwrites `session.result` (`sessions-service.js:finalizeSession` TODO). Out of scope for 5.0.0.

---

## 4. Coverage

One code path in the test-box, regardless of mode:

```js
await globalThis.__jtStartCoverage();
// run test
const coverage = await globalThis.__jtStopCoverage();
// attach to TestRun.coverage, post result
```

Backend exposes `__jtStartCoverage` / `__jtStopCoverage` as Playwright `context.exposeBinding`s. The binding uses `source.page` and ref-counts overlapping starts, so parallel tests on a shared page don't double-arm V8.

| Mode | Where the binding fires | Attribution |
|---|---|---|
| **Node (worker_thread)** | `nodejs-test-box.ts` uses Inspector `Profiler.startPreciseCoverage` directly — no binding, same shape | Per-test |
| **Browser `page`** | Binding → each test's own child page | **Per-test** |
| **Browser `iframe`** (default) | Binding → main page (iframes share V8). Session-box collapses per-test coverage into `session.coverage` after `runSession`; `local-runner` emits `TN:__session__` | Session-global |
| **Browser `worker`** | Worker has no `window` and no binding reaches it; test-box installs no-op shims | None (page.coverage doesn't cover workers) |
| **Interactive** | Binding is wired but there's no automated coverage report | Session-global by nature |

URL normalization is centralized in `coverage/model/url-utils.ts` (`normalizeCoverageUrl`) and applied at every matcher boundary.

Only `page` mode gives true per-test browser coverage. `iframe` is the default (cheaper, fewer pages) and produces honest session-global coverage. Choose per config; policy is explicit in `docs/coverage.md`.

---

## 5. Public API

`runner/just-test.js` exports:

```js
export { test, TestDto };
```

- `test(name, code, opts)` — declare a test. Mode-dependent via execution context (`PLAN` registers, `TEST` runs, `PLAIN_RUN` runs immediately for library use). Per-test timeout enforced by `Promise.race` (default 3000 ms).
- `TestDto` — payload passed to `opts`.

Assertions live in `common/assert-utils.js` (consumed, not advertised).

**Removed in 5.0.0:** `suite()`.

---

## 6. Dogfooding

`tests/` uses just-test on itself; per-env configs under `tests/_configs/`:

- `tests-config-ci-chromium.ts` — default iframe executor
- `tests-config-ci-chromium-page.ts` — page-per-test (real per-test coverage)
- `tests-config-ci-chromium-worker.ts` — worker-per-test (no coverage, exercises the no-op path)
- `tests-config-ci-firefox.ts`, `-webkit.ts` — cross-browser
- `tests-config-ci-nodejs.ts` — node worker threads

Covered: models, coverage utilities, server utilities. Not covered: session orchestration, env launch, interactive UI.

---

## 7. Open gaps

| # | Tier | What |
|---|---|---|
| 1 | 2 | Test discovery duplicated between `browser-session-box.js` and `nodejs-session-box.ts` — extract a shared `planSession`. |
| 2 | 2 | `src/configurer.js` is dead — delete. |
| 3 | 3 | Multi-env session finalization: last env wins; `sessions-service.js:finalizeSession` is still a TODO. |
| 4 | 3 | Resource pooling of iframes/pages/workers (three TODOs in `browser-session-box.js`). |
| 5 | 3 | `functions` coverage in `v8-coverage-converter.js` — not emitted to lcov; line-level is sufficient for now. |
