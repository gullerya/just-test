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
- [ ] **2.4 `coverage` config is sent verbatim only to be tested as boolean.** Send `coverageEnabled: boolean` in the sandbox metadata instead of the whole config.
- [ ] **2.5 Rename `SimpleStateService` — the `Simple` prefix lies.** Only state service; drop the prefix.
- [ ] **2.6 Test-box handshake race.** `addEventListener('message', ...)` after module eval relies on postMessage queueing. Add explicit `{ type: 'ready' }` handshake before dispatch.

## Tier 3 — observability / polish

- [ ] **3.1 Coverage ref-count can leak on page crash.** `browser-env-service.js:#pageCoverage` — add `page.on('close')` cleanup (matters for long-running interactive sessions only).
- [ ] **3.2 Env-scoped logs lack identity.** `environments-service.js:57` — include env type+id in error logs.
- [ ] **3.3 `waitInterval(999)` / `waitInterval(100)` dismiss-grace hacks.** Replace with deterministic flush (`networkidle`, or explicit last-message await). CI time savings.
- [ ] **3.4 No integration test for per-mode coverage semantics.** Add `tests/server/test-coverage-modes.ts` that asserts iframe → 1 `TN:__session__`, page → ≥1 per-test, worker → 0. Prevents silent regression.

---

## Suggested next step (if resuming cold)

1. **1.3 + 1.2** together — correctness bugs, CI-hang risk, both touch `sessions-service` + `local-runner`, one cohesive PR.
2. **1.1 + 1.4** — remaining Tier 1 correctness items.
