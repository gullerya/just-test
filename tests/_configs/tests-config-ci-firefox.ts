const config = {
	environments: [
		{
			browser: {
				type: 'firefox',
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
					//	Worker-only: relative-path imports, covered by the
					//	chromium-worker config
					'**/tests/_worker/**',
					//	Node-only: imports node:os / uses `glob` / server-specific
					'**/tests/coverage/reporters/**',
					'**/tests/coverage/coverage-service-test.ts',
					'**/tests/coverage/coverage-configurer-test.ts',
					'**/tests/server/**'
				]
			}
		}
	]
};

export default config;