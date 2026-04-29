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
					//	Worker-only: browser smoke test, covered by the
					//	chromium-worker / firefox configs
					'**/tests/_worker/**'
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