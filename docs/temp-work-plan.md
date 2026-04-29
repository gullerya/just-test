# just-test — automated-path work plan (temp)

Review of the automated path (Node + browser) as of 2026-04-28, after the coverage binding unification shipped. Interactive and UI are **out of scope** for this plan.

Items are tiered by impact. Tick off as they ship; add/remove as reality changes.

---

## Tier 2 — architectural simplification

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

1. **3.4** — lock the per-mode coverage invariants before any more refactors touch that area.
2. **2.5** — trivial rename, good warm-up.
3. **2.1** — larger SDK consolidation; schedule after 3.4.
