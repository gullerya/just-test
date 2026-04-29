# just-test — automated-path work plan (temp)

Review of the automated path (Node + browser) as of 2026-04-28, after the coverage binding unification shipped. Interactive and UI are **out of scope** for this plan.

Items are tiered by impact. Tick off as they ship; add/remove as reality changes.

---

## Remaining

- [ ] **3.4 No integration test for per-mode coverage semantics.** Add `tests/server/test-coverage-modes.ts` that asserts iframe → 1 `TN:__session__`, page → ≥1 per-test, worker → 0. Prevents silent regression. **Deferred** — to be done as part of a wider unit-test coverage effort.
---