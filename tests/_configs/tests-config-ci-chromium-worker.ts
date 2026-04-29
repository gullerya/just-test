//	same as tests-config-ci-chromium but with the `worker`-per-test browser
//	executor. coverage is a no-op in worker mode (page.coverage does not
//	cover worker scripts) — the run should still succeed and produce a
//	valid (possibly empty) lcov with the untouched-file fallback
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
					'./tests/**/*'
				],
				exclude: [
					'**/_configs/**',
					//	Node-only: imports node:os / uses `glob` / server-specific
					'**/tests/coverage/reporters/**',
					'**/tests/coverage/coverage-service-test.ts',
					'**/tests/coverage/coverage-configurer-test.ts',
					'**/tests/server/**'
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
