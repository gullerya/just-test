//	same as tests-config-ci-chromium but with the `page`-per-test browser
//	executor, so per-test coverage (collected on page close, keyed by
//	TEST_ID) is exercised in CI
const config = {
	environments: [
		{
			browser: {
				type: 'chromium',
				executors: {
					type: 'page'
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
