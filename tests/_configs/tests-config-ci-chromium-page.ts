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
					//	Fixtures consumed by session-planner-test
					'**/tests/runner/_planner-fixtures/**',
					//	Worker-only: relative-path imports, covered by the
					//	chromium-worker / firefox configs
					'**/tests/_worker/**',
					//	Node-only: imports node:os / uses `glob` / server-specific
					'**/tests/coverage/reporters/**',
					'**/tests/coverage/coverage-service-test.ts',
					'**/tests/coverage/coverage-configurer-test.ts',
					'**/tests/server/**',
					//	Flaky under chromium + page-per-test: spawning ~200
					//	popups alongside nested `import()` calls races in
					//	Chromium (passes in iframe-chromium, firefox-page,
					//	webkit-iframe, nodejs). Exercised by those configs.
					'**/tests/runner/session-planner-test.ts'
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
