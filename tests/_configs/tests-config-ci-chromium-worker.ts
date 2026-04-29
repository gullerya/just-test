//	`worker`-per-test browser executor, scoped to `tests/_worker/` only.
//	Web Workers don't inherit the host document's importmap, so bare
//	specifiers like `@gullerya/just-test` don't resolve inside the worker
//	test-box. Tests that must run here use a relative path through
//	`node_modules/` instead — see `docs/architecture.md` §6.1.
//
//	All other tests in the repo use bare imports and run in the iframe /
//	page / node configs; this config deliberately does not include them.
//	coverage is a no-op in worker mode (page.coverage does not cover
//	worker scripts).
const config = {
	environments: [
		{
			browser: {
				type: 'chromium',
				executors: {
					type: 'worker'
				}
			},
			tests: {
				ttl: 300000,
				maxFail: 0,
				maxSkip: 0,
				include: [
					'./tests/_worker/**/*'
				]
			},
			coverage: {
				include: [
					'./src/**/*'
				],
				reports: [
					{
						type: 'lcov'
					}
				]
			}
		}
	]
};

export default config;
