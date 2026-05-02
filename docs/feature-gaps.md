# Feature Gaps

Gaps observed while writing tests against `just-test` itself. Ranked by how often the absence costs a test author time or correctness.

---

## 1. Lifecycle hooks — `beforeEach` / `afterEach` / `beforeAll` / `afterAll`

**Status:** not implemented.

**Symptom.** Every test that needs setup/teardown inlines it and wraps the body in `try { ... } finally { restore(); }`. Forgetting the `finally` leaves global state (e.g. a stubbed `globalThis.fetch`) poisoning later tests in the same file.

**Current workaround** — from `tests/server/orchestrator-client-test.ts`:

```ts
test('createSession - POSTs JSON body', async () => {
    const stub = installFetch([{ status: 201, body: {...} }]);
    try {
        // ...test body...
    } finally {
        stub.restore();
    }
});
```

**What's needed.** Per-suite (file) and per-test hooks that run regardless of pass/fail:

```ts
beforeEach(() => { stub = installFetch([...]); });
afterEach(() => { stub.restore(); });
```

**Why it's #1.** It's a multiplier — it would delete ~40% of the boilerplate in the existing suite, cut a class of flaky-test bugs, and is a prerequisite for any sensible `describe` grouping.

---

## 2. Nested test groups — `describe(...)` / `suite(...)` blocks

**Status:** not implemented. A "suite" is currently `1 file = 1 suite`, flat.

**Symptom.** No way to group tests inside a file with shared setup, shared naming prefix, or focused/skipped scopes. Files balloon when a module has multiple behavioral areas (see `assert-utils-test.ts`, which has ~47 tests mixing `AssertionError` shape, equality, throws, etc., separated only by comment banners).

**What's needed.** At minimum a single level of nesting, interacting cleanly with #1:

```ts
describe('OrchestratorClient.pollSessionResult', () => {
    beforeEach(() => { stub = installFetch([...]); });
    afterEach(() => { stub.restore(); });

    test('200 returns {ready: true, result}', async () => { ... });
    test('204 returns {ready: false}',          async () => { ... });
});
```

Nesting depth > 1 is nice-to-have; even one level addresses most pain.

---

## 3. CLI test-name filter / focused running

**Status:** partially addressed. File/path filtering via `files=<pattern>` is now supported (strict override of `tests.include` + `tests.exclude`). Name-level focusing is still missing.

Still to do:
- `test.only(name, fn)` and `test.skip(name, fn)` shorthand
- `--grep "<pattern>"` CLI flag that filters by test name regex

The `files=` override removed the "write a throwaway config to isolate a file" pain. Name-regex filter remains the next step for inner-loop TDD.

---

## 4. Drop the in-house assertion library — bring your own

**Status:** `src/common/assert-utils.ts` is still shipped as `@gullerya/just-test/assert`. No consumer outside the repo's own tests is known to use it.

**Thesis.** `just-test` is a test runner, not a framework. Assertions are userland. Shipping an in-house lib couples the runner to the quality of our own `throws` / `deepEqual` / diff output, when Chai / Node `assert` / any other lib solves it better and is already ESM + bare-import friendly.

**Plan (breaking, one version bump):**

- Delete `src/common/assert-utils.ts` and its tests.
- Drop the `./assert` entry from `package.json#exports`. Remove `@gullerya/just-test/assert` from the browser importmap defaults.
- Define the runner's contract explicitly in `docs/architecture.md`:
    - Any thrown error whose `name` contains `assert` (case-insensitive) classifies as `STATUS.FAIL`; all others as `STATUS.ERROR`.
    - `expected`, `actual`, `operator`, `showDiff` fields on thrown errors are preserved end-to-end through `TestError` → `TestRun.error` → xunit `<failure>`.
- Verify the preservation with one integration test: throw `{ name: 'AssertionError', expected, actual }` and assert the xunit output retains both fields.
- Migrate the repo's own `tests/` to Chai 5 as the first consumer of the new boundary. This is the dogfooding proof.
- Changelog as a breaking change; readme points at Chai (or any standard lib) as a suggestion, not a requirement.

**Why now.** 5.0 already removed `suite()`. Removing `assert` continues the "runner, not framework" positioning without a second breaking bump.

**Why this also closes the old "assertion diffs" gap.** Chai produces structural diffs natively; Node `assert/strict` embeds `expected`/`actual` in its error. By preserving those fields through `TestError` we get diffs for free, from whatever lib the consumer chose, without owning the code.

---

## 4a. Align the test declaration API with Node's built-in test runner

**Status:** `just-test`'s surface (`test(name, code, opts?)`) is a custom shape. Every mainstream alternative — Node `node:test`, Mocha, Jest, Vitest — uses a different ordering or different semantics. The one place consumers can't isolate behind an abstraction is the one place we're nonstandard.

**Thesis.** `just-test` is a runner. Test declaration is userland contract; picking the *spec* that contract conforms to matters more than the contract itself. Of the candidates, only `node:test` is a written spec (not a tool), is assertion-agnostic (composes with the "bring your own assertions" direction in #4), and has zero-dep conformance for free in the Node path.

**Plan (same major as #4, so consumers take one break, not two):**

- Adopt Node's shape as the spec:
    - `test(name, opts?, fn)` — note the arg order flip from the current `test(name, fn, opts?)`.
    - `describe(name, opts?, fn)` / `it(name, opts?, fn)` — one level of nesting minimum (closes gap #2).
    - `before` / `after` / `beforeEach` / `afterEach` (closes gap #1).
    - `skip` / `only` / `todo` honored via `opts` and (optionally) `test.skip(...)` / `test.only(...)` shorthands.
- **Node path**: re-export from `node:test` directly. Listen to its run events / TAP stream for reporting. Free conformance, nothing to polyfill.
- **Browser path**: implement a strict subset polyfill with the same signatures — the session-box already owns the execution loop, so this is mostly name-tree + hook-stack bookkeeping. Target ~a few hundred lines.
- **Shared core**: the `TestRegistry` / `session-planner` seam already exists; both paths emit into it so reporters stay environment-agnostic.
- **Conformance claim** in the readme: *"test declaration is a subset of Node's built-in test runner; tests written against `node:test` run unchanged here."* Explicitly document what's not covered (e.g. `t.mock`, full subtest trees if omitted).

**Why now.** `#4` (assert-lib removal) is a breaking change for the next major. `node:test` adoption is another. They belong in the same cut — one break, one changelog, clean re-positioning as "runner, not framework."

**Honest cost.**

- Arg-order flip from `(name, fn, opts)` to `(name, opts, fn)` — we just documented the current order in 5.0.1. It flips in the next major.
- Node's API has surface we may not want (TAP output, `t.mock`, full subtests). Shipping a strict subset and documenting the omissions is legitimate; pretending it's full conformance is not.
- Browser polyfill is new code to own. Payoff is that it conforms to a stable written spec rather than drifting with whatever we invent next.

**Why not Vitest/Jest as the anchor.** Vitest is the most popular, but it's a tool, not a spec, and its declaration API is tangled with `expect`-style assertions. Building on `node:test` keeps the runner assertion-neutral; a Vitest-compat shim can be added later on top of a `node:test`-shaped core. The reverse is much harder.

---

## 5. Rerun-failed / watch mode

**Status:** not implemented.

**Symptom.** During TDD on a single module, the full Node suite re-runs 265 tests to verify a 5-line change. No `--bail` (stop at first failure), no `--watch` (rerun on file change), no "run only tests that failed last time."

**What's needed.**

- `--bail` CLI flag
- `--watch` mode that re-runs the suite on file changes (node-side minimum; browser-side can follow)
- Persist last run's failure names to a cache; `--rerun-failed` reads that cache

---

## 6. Per-test timeout signal distinct from failure

**Status:** TTL expiry is reported as `status: fail` with no flag distinguishing it from an assertion failure.

**Symptom.** When debugging the chromium-page session-planner flake, `time="4.5"` on `<failure/>` was the only clue that it was a timeout vs. an assertion. If TTL were its own status (or at least a flag on the failure), diagnosis would be immediate.

**What's needed.** Either a distinct `STATUS.TIMEOUT` or a `timedOut: true` field on the run, surfaced in xunit output and CLI summary.

---

## 7. Intra-file test parallelism

**Status:** tests within a file run sequentially. Across files, the session runs them in parallel environments (Node workers / browser popups), but a single file = single stream.

**Symptom.** Files with many independent tests (e.g. the 47-test `assert-utils-test.ts`) could be ~10× faster if their tests ran concurrently. Especially felt in the Node suite wall-clock time.

**What's needed.** An opt-in `parallel: true` flag on the file config (or on the `test(...)` call) to allow concurrent execution of same-file tests that opt in. Default stays sequential to preserve current semantics.

---

## 8. Snapshot assertions

**Status:** not implemented.

**Symptom.** `xunit-reporter-test.ts` asserts with ~30 calls to `assert.isTrue(xml.includes('tests="5"'))`. That's a hand-rolled, weaker version of a structural snapshot. Same pattern will recur for any reporter / renderer / serializer test.

**What's needed.** An opt-in `assert.matchSnapshot(actual, id?)` with snapshots stored under `__snapshots__/` or `<file>.snap.txt`. Obligation on the author to keep snapshots meaningful (not blanket-regenerate on every failure).

---

## 9. Parameterized / table tests

**Status:** not implemented.

**Symptom.** Testing 10 input variations requires 10 `test(...)` blocks with near-identical bodies. Easy to let them drift.

**What's needed.** `test.each([...])` or equivalent:

```ts
test.each([
    ['empty',    '',      TypeError],
    ['null',     null,    TypeError],
    ['numeric',  123,     TypeError],
])('OrchestratorClient rejects %s baseUrl', (_, input, expected) => {
    assert.throws(() => new OrchestratorClient(input), expected.name);
});
```

---

## 10. Better stack traces for import-time fixture failures

**Status:** `session-planner` wraps the error via `TestError.fromError` — but the stack gets truncated at the planner frame, not the user's file.

**Symptom.** A fixture that throws during import (e.g. `tests/runner/_planner-fixtures/throws-on-import.ts`) reports the failure with a stack pointing into `session-planner.ts`, not the fixture. Required grepping to find where "boom" actually came from.

**What's needed.** Preserve the original stack on `TestError.cause` and render it in the xunit `<error>` / CLI summary.

---

## Tooling-adjacent gaps (framework-proximate)

**11. Coverage gate.** `maxFail: 0` / `maxSkip: 0` exist. No `minCoverage: 80` enforcement — coverage is reported but not enforced.

**12. `console.*` capture.** In browser envs, `console.log` inside a test goes to the popup/iframe console, nowhere visible from the host CLI. Attaching DevTools to a Playwright popup mid-run is painful.

**13. Timeout-per-test overrides at the CLI.** `ttl` is config-file-scoped. No way to temporarily bump one test's TTL without editing the source or the config.

---

## Recommended priority order

The next major is a single repositioning: **"runner, not framework."** #4 and #4a ship together — one break, one changelog.

| Rank | Item | Blast radius |
|---|---|---|
| 1 | `node:test`-compatible declaration API (#4a) | Next major. Subsumes #1, #2, and most of #3 — hooks, `describe`, `skip`/`only` all come with the spec. |
| 2 | Drop in-house assert lib (#4) | Next major. Shrinks the surface; diffs come from Chai/Node for free. |
| 3 | CLI name filter — `--grep` (#3 residual) | Inner-loop speed once `skip`/`only` are standard. |
| 4 | Rerun-failed / watch (#5) | Inner-loop speed. |
| 5 | Snapshot, parameterized, parallelism (#8, #9, #7) | Opt-in conveniences on top of a stable core. |

`#4a + #4` together is the biggest single architectural shift. `#3` + `#5` are the follow-up quality-of-life pass once the new API surface has settled.
