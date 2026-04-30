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

## 4. Assertion diffs on failure

**Status:** `AssertionError` embeds `actual` and `expected` as JSON — no diff, no pretty-print.

**Symptom.** `assert.deepEqual(actualBigObject, expectedBigObject)` fails and dumps two JSON blobs. For objects > ~5 keys deep, eyeballing the delta is a real time-sink. In the xunit reporter, the `<failure>` element gets the JSON blob as text content — no diff there either.

**What's needed.** A built-in structural diff on `deepEqual` / `deepStrictEqual` failures. Even a line-diff over `JSON.stringify(..., null, 2)` would be a large step up. Include the diff both in the thrown error's `message` and in the xunit `<failure>` textContent so CI logs are useful.

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

| Rank | Item | Blast radius |
|---|---|---|
| 1 | Lifecycle hooks (#1) | Affects every test with setup/teardown |
| 2 | `describe` groups (#2) | Unlocks #1's full value |
| 3 | CLI name filter + `test.only` shorthand (#3) | Day-to-day TDD speed |
| 4 | Assertion diffs (#4) | Debug time on every `deepEqual` failure |
| 5 | Rerun-failed / watch (#5) | Inner-loop speed |

`#1` and `#3` together would be the biggest single quality-of-life jump.
