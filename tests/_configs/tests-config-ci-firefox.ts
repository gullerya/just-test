const config = {
	environments: [
		{
			browser: {
				type: 'firefox'
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
					'**/tests/runner/**',
					'**/tests/server/**'
				]
			}
		}
	]
};

export default config;