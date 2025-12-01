const config = {
	environments: [
		{
			interactive: true,
			tests: {
				maxFail: 0,
				maxSkip: 0,
				include: [
					'./tests/runner/**/*.js',
					'./tests/common/**/*.js'
				],
				esclude: [
					'**/_configs/*'
				]
			}
		}
	]
};

export default config;