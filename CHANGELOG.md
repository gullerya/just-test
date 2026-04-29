#	Changelog

All notable changes to `@gullerya/just-test` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

##	[Unreleased]

###	Fixed

-	`normalizeCoverageUrl` now throws `TypeError` on empty / non-string input
	instead of silently passing it through, so coverage match-set equality
	can no longer be poisoned by an empty key.
-	`finalizeSession` now publishes a proper `Session`-shape failure object
	(and flips `resultReady`) when no environment reports a result, instead
	of assigning the string `'failure'` and leaving `/result` stuck at 204.
-	`local-runner`'s `waitSessionEnd` has a 30-minute hard timeout and
	propagates fetch errors via `reject`, closing the CI-hang path where a
	crashed env would loop forever.
-	Error-path `dismiss()` and `finalizeSession()` calls inside event
	listeners are now `.catch`-guarded so promise rejections are logged
	instead of becoming unhandled rejections.
-	`assert.deepEqual` now compares symmetrically — extra keys on
	`actual` that aren't in `expected` are flagged (previously the
	check only iterated `expected`'s keys, so `{a:1,b:2}` was
	considered "deep-equal" to `{a:1}`). Matches `deepStrictEqual`'s
	behavior.

###	Changed

-	Declarative route table in `api-request-handler`: each verb/path is
	registered once with named params (`:sesId`, `:envId`) and dispatched
	to a dedicated handler, replacing the nested `split('/').slice(2)`
	branching.
-	`EnvironmentMetadata` now carries `coverageEnabled: boolean` and a
	narrow `coverageInclude: string[]` instead of the whole coverage
	config. Report settings, exclusions, and output paths stay
	server-side. Sandboxes (browser test-box, nodejs test-box) were
	updated accordingly.
-	`SimpleStateService` renamed to `StateService`
	(`src/runner/state-service.ts`); the `Simple` prefix no longer
	implied a contrast.
-	Dismiss-grace `waitInterval(999)` / `waitInterval(100)` hacks
	removed from browser and nodejs env services. CI time dropped ~1s
	per browser config.
-	Env-scoped error logs now include both env id and type
	(`interactive` / `browser` / `node`).
-	REST access consolidated into a typed `OrchestratorClient` SDK at
	`src/server/orchestrator-client.ts`, consumed from both Node (local-runner,
	nodejs-session-box) and browser (browser-session-box, interactive UI).
	`src/runner/server-api-service.ts` and the local-runner's inline
	`sendAddSession` / fetch-in-`waitSessionEnd` are gone; the polling
	loop stayed in `local-runner` where the timeout policy belongs.
-	Wire shapes (`SessionCreateResponse`, `EnvironmentMetadata`) moved to
	`src/server/api-contracts.ts` — the server owns them, the SDK
	re-exports. The `environments/:id/config` + `test-file-paths` endpoint
	pair collapsed into a single `environments/:id/metadata` endpoint
	that returns the full stitched shape, so the SDK no longer stitches
	on the client side.
-	Source tree migrated from `.js` to `.ts`; dead `src/configurer.js`
	removed.
-	Shared `src/runner/session-planner.ts` extracted and reused by both
	browser and nodejs session-boxes.
-	Build (`ci/build.ts`) now aggregates TS pre-emit + emit diagnostics and
	exits non-zero on any error-severity diagnostic.
-	Lint configs ignore `bin/**` so built output is no longer walked.
-	Test files renamed to the `<source>-test.<ext>` convention, mirrored
	under `tests/` next to the source they cover (e.g. `src/coverage/
	model/url-utils.ts` → `tests/coverage/model/url-utils-test.ts`).
	Unit coverage added for `url-utils`, `lcov-reporter`, and
	`v8-coverage-converter` (all now 100%), plus `range-utils`,
	`file-cov`, `line-cov`, and `base-range` (all now 100%).
-	Browser CI configs' blanket `tests/coverage/**` exclusion narrowed
	to only the genuinely Node-only files (`reporters/**`,
	`coverage-service-test.ts`, `coverage-configurer-test.ts`). The
	pure coverage-model, url-utils, and v8-converter test files now
	run in browsers as well as Node — matrix coverage (iframe / page /
	worker × chromium / firefox / webkit) on shared logic.
-	Tests now import the harness (`test`, `assert`) from the installed
	`@gullerya/just-test` package (bare imports) rather than from live
	`src/`, decoupling test-harness stability from in-flight source
	changes. Node resolves bare imports via `node_modules`; browsers
	resolve them through the importmap injected by the static handler.
-	Worker-mode example test suite added at `tests/_worker/` (smoke
	test). Web Workers do not inherit the host document's importmap,
	so these tests import via a relative path through `node_modules/`
	instead. The `chromium-worker` config is scoped to
	`tests/_worker/**`; non-worker configs exclude it — the matrix now
	exercises both import styles without overlap. See
	`docs/architecture.md` §6.1.

##	[5.0.0 - 2026-04-21]

###	Breaking changes

-	Removed the `suite` export from `@gullerya/just-test`. `suite.configure()` was
	a validate-only stub with no effect; the file itself has always been the
	grouping unit. Consumers that were importing or calling `suite` MUST delete
	those imports and calls. `test()` is unchanged.

###	Added

-	Per-test coverage for browser environments in `page` executor mode is now
	collected through a Playwright context-level route gate that installs V8
	coverage before the first script request on each page, so child pages
	spawned via `window.open` produce real coverage instead of empty records.
	All browser-side coverage from a session (main session-box page, iframe /
	worker hosts, per-test pages) is aggregated into a single `__session__`
	lcov record reflecting the union of what the session executed.
-	New CI config `tests/_configs/tests-config-ci-chromium-page.ts` and matching
	npm script `test:ci:chromium:page` to exercise the `page` executor end to
	end in CI.
-	Per-test coverage artifacts produced by environments are now wired through
	`storeResult` and attached to `test.lastRun.coverage`, so downstream
	reporters can emit per-test lcov records keyed by the canonical
	`getTestId(suite, test)` identity.

###	Changed

-	Coverage URLs are now canonicalized at the matcher seam via
	`coverage/model/url-utils.js#normalizeCoverageUrl()`. Producers (Node
	Inspector's cwd-relative paths, Playwright's `${origin}/static/`-rewritten
	URLs, glob-emitted target paths) are reconciled into a single POSIX-style
	relative form with no leading `./`, query, or hash. Match is now an
	O(n+m) `Set` lookup instead of O(n*m) string compare, and coverage no
	longer silently drops into the zero-hit fallback across a leading `./`.
-	Per-test lcov `TN:` records are keyed by `getTestId(suite, test)` instead
	of the bare test name, so tests sharing a name across suites no longer
	collide in the report.
-	Session result polling (`GET /api/v1/sessions/{id}/result`) now returns
	`204` until coverage artifacts have been merged into the session
	(`session.resultReady`), closing the race where the local-runner poller
	could resolve before coverage attached.
-	Dependency bumps: `eslint` 9 → 10, `typescript` 5 → 6, `playwright` 1.56
	→ 1.59, `glob` 12 → 13, `minimatch` 10.1 → 10.2.
-	Repository normalized to LF line endings via `.gitattributes`.

[5.0.0]: https://github.com/gullerya/just-test/releases/tag/v5.0.0
