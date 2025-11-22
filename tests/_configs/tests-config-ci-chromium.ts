const config = {
	environments: [
		{
			browser: {
				type: "chromium",
				executors: {
					type: "page"
				}
			},
			tests: {
				ttl: 300000,
				maxFail: 0,
				maxSkip: 0,
				include: [
					'./tests/**/*.js'
				],
				exclude: [
					'**/_configs/**',
					'**/tests/coverage/**',
					'**/tests/runner/**',
					'**/tests/server/**'
				]
			},
			coverage: {
				include: [
					'./src/**/*.js'
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