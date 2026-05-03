const config = {
	environments: [
		{
			browser: {
				type: 'chromium',
				executors: {
					type: 'iframe'
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
					//	Imports `minimatch` (bare specifier, unresolvable
					//	in the browser without an importmap entry)
					'**/tests/coverage/model/v8-coverage-filter-test.ts',
					'**/tests/server/**',
					'**/tests/local-runner-test.ts',
					//	Node-only: testing-service.ts imports `glob`
					//	(bare specifier, unresolvable in the browser);
					//	testing-configurer.ts transitively pulls node:util
					//	via the server logger
					'**/tests/testing/testing-service-test.ts',
					'**/tests/testing/testing-configurer-test.ts',
					//	Node-only: FileOutput imports node:fs/node:os/node:path
					'**/tests/logging/file-output-test.ts'
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