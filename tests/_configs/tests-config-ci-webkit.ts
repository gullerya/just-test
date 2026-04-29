const config = {
	environments: [
		{
			browser: {
				type: 'webkit',
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