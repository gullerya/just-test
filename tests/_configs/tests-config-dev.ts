const config = {
	environments: [
		{
			interactive: true,
			tests: {
				maxFail: 0,
				maxSkip: 0,
				include: [
					'./tests/runner/**/*.ts',
					'./tests/common/**/*.ts'
				],
				exclude: [
					'**/_configs/*'
				]
			}
		}
	]
};

export default config;