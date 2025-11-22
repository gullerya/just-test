const config = {
	environments: [
		{
			node: true,
			tests: {
				ttl: 300000,
				maxFail: 0,
				maxSkip: 0,
				include: [
					'./tests/**/*'
				],
				exclude: [
					'**/_configs/**',
					'**/runner/*'
				]
			},
			coverage: {
				include: [
					'./src/**/*'
				]
			}
		}
	]
};

export default config;