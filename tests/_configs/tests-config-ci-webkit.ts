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
					'**/tests/coverage/**',
					'**/tests/server/**'
				]
			}
		}
	]
};

export default config;