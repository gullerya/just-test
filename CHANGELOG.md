#	Changelog

All notable changes to `@gullerya/just-test` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

##	[Unreleased]

###	Changed

-	Source tree migrated from `.js` to `.ts`; dead `src/configurer.js`
	removed.
-	Shared `src/runner/session-planner.ts` extracted and reused by both
	browser and nodejs session-boxes.
-	Build (`ci/build.ts`) now aggregates TS pre-emit + emit diagnostics and
	exits non-zero on any error-severity diagnostic.
-	Lint configs ignore `bin/**` so built output is no longer walked.

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
