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
					'**/tests/coverage/**',
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