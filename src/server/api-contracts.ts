/**
 * Wire-level contracts for the JustTest orchestrator REST API.
 *
 * The server is the owner of these shapes — handlers return them, the
 * `OrchestratorClient` SDK consumes them. Anything that is pure client
 * protocol glue (e.g. collapsing a 200/204 polling protocol into a
 * discriminated union) belongs in the client, not here.
 */

export type SessionCreateResponse = {
	sessionId: string;
};

/**
 * Returned by `GET /api/v1/sessions/:sessionId/environments/:envId/metadata`.
 * Represents everything a session-box (browser or node) needs to start
 * planning and executing: the environment config as validated by the
 * orchestrator, the resolved list of test file paths, and the owning
 * session id.
 */
export type EnvironmentMetadata = {
	id: string;
	sessionId: string;
	testPaths: string[];
	//	one of these three is populated per the env configurer
	browser?: any;
	node?: any;
	interactive?: any;
	tests?: any;
	//	narrow coverage contract — sandboxes learn whether to emit
	//	coverage and (for nodejs) the include-glob list used to filter
	//	V8 entries at collection time. Everything else in the coverage
	//	config (report settings, exclusions, output paths) stays
	//	server-side where the report is aggregated.
	coverageEnabled: boolean;
	coverageInclude?: string[];
};
