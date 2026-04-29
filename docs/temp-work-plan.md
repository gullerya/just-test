# just-test — automated-path work plan (temp)

Review of the automated path (Node + browser) as of 2026-04-28, after the coverage binding unification shipped. Interactive and UI are **out of scope** for this plan.

Items are tiered by impact. Tick off as they ship; add/remove as reality changes.

---

## Tier 1 — shipping-quality issues

- [ ] **1.1 `normalizeCoverageUrl` silently passes empty input through.** `local-runner.ts:125` equality relies on it being total. Add a non-empty guard or make the function throw on falsy input.
- [ ] **1.2 CI hang risk: `waitSessionEnd` has no timeout.** `local-runner.ts:186` `TODO: add global timeout`. If the env errors before posting a result, `session.resultReady` never flips and the poll loops forever. Make env-error path also mark `resultReady = true` with a failure result.
- [ ] **1.3 `finalizeSession` returns a string, not a Session.** `sessions-service.ts:104` sets `session.result = 'failure'`. Downstream `sessionResult.summary.success` explodes. Must be a proper `Session`-shape failure object.
- [ ] **1.4 Error-path `dismiss()` is fire-and-forget.** `environments-service.js:56-60` and `sessions-service.ts:67-74` dispatch async work in event listeners without awaiting — unhandled rejections possible.

## Tier 2 — architectural simplification

- [ ] **2.1 Unify the REST client as an SDK.** `runner/server-api-service.js` has half; `local-runner.ts` inlines the other half (`sendAddSession`, `waitSessionEnd`). Consolidate into one typed `src/server/client.ts`. Matches SDK-driven principle.
- [ ] **2.2 Route matcher in `api-request-handler.ts`.** Three handlers, three shapes of `split('/').slice(2)`. Extract a declarative `/sessions/:sesId/environments/:envId/:action` matcher.
- [x] **2.3 Extract `session-planner` shared between browser/node session-boxes.** *DONE — 2026-04-28.* See `src/runner/session-planner.ts`; both session-boxes pass a fetcher.
- [ ] **2.4 `coverage` config is sent verbatim only to be tested as boolean.** Send `coverageEnabled: boolean` in the sandbox metadata instead of the whole config.
- [ ] **2.5 Rename `SimpleStateService` — the `Simple` prefix lies.** Only state service; drop the prefix.
- [ ] **2.6 Test-box handshake race.** `addEventListener('message', ...)` after module eval relies on postMessage queueing. Add explicit `{ type: 'ready' }` handshake before dispatch.

## Tier 3 — observability / polish

- [ ] **3.1 Coverage ref-count can leak on page crash.** `browser-env-service.js:#pageCoverage` — add `page.on('close')` cleanup (matters for long-running interactive sessions only).
- [ ] **3.2 Env-scoped logs lack identity.** `environments-service.js:57` — include env type+id in error logs.
- [ ] **3.3 `waitInterval(999)` / `waitInterval(100)` dismiss-grace hacks.** Replace with deterministic flush (`networkidle`, or explicit last-message await). CI time savings.
- [ ] **3.4 No integration test for per-mode coverage semantics.** Add `tests/server/test-coverage-modes.ts` that asserts iframe → 1 `TN:__session__`, page → ≥1 per-test, worker → 0. Prevents silent regression.
- [x] **3.5 Delete `src/configurer.js`.** *DONE — 2026-04-28.* Removed as part of 4.1 sweep.

## Tier 4 — build / TS setup

- [x] **4.1 Commit to one of `.ts` or `.js` — not hybrid.** *DONE — 2026-04-28.* All 48 `src/**/*.js` renamed to `.ts`; `configurer.js` deleted. UI files carry `// @ts-nocheck` because `rich-component` ComponentBase exposes DOM-derived members dynamically and `/core/...` imports resolve at runtime through the core-request-handler. `tsc --noEmit` clean; 4/4 test configs green.
- [ ] **4.2 Build silently ignores TS diagnostics.** `ci/build.ts` collects `emitResult` but never checks severity. Fail the build if any error-severity diagnostic. 10 lines.
- [ ] **4.3 Lint scopes to `bin/` — remove.** Eslint configs lint the built output; narrow scope to `src/` + `tests/`. Quiets CI logs.

---

## Suggested next step (if resuming cold)

1. **1.3 + 1.2** together — correctness bugs, CI-hang risk, both touch `sessions-service` + `local-runner`, one cohesive PR.
2. **4.2** — tiny, prevents future regressions of the same kind we just fixed.
3. **3.5** — free win, opens doors for 4.1.
