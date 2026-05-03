//	Iframe/worker browser modes share one V8 with the host page, so
//	per-test coverage attribution is nominal — the last-to-finish test
//	receives the aggregated bracket. Flatten all per-test coverage into
//	one session-level array so the backend can emit an honest
//	`__session__` lcov record. Page mode has real per-test attribution
//	and is left alone by the caller.

export function collapseToSessionCoverage(session: { suites: any[]; coverage?: unknown }): void {
	const merged = [];
	for (const suite of session.suites) {
		for (const t of suite.tests) {
			if (t.lastRun?.coverage?.length) {
				merged.push(...t.lastRun.coverage);
				t.lastRun.coverage = null;
			}
		}
	}
	if (merged.length) {
		session.coverage = merged;
	}
}
