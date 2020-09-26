import Logger from '../logger/logger.js';

//	TOOD: do reporters as a separate module, each with it's own registration routine + extensibility

const
	logger = new Logger({ context: 'tests-configurer' }),
	TEST_REPORTERS = ['xUnit'],
	DEFAULT_CONFIG = Object.freeze({
		ttl: 30000,
		maxFail: 0,
		maxSkip: 0,
		include: [],
		exclude: [],
		reporters: [
			{ type: 'xUnit', path: './reports/test-results.xml' }
		]
	});

export default (testsConfig) => {
	const result = Object.assign(
		{},
		DEFAULT_CONFIG,
		Object.entries(testsConfig)
			.filter(([key]) => key in DEFAULT_CONFIG)
			.reduce((pv, [key, value]) => { pv[key] = value; return pv; }, {})
	);

	validate(result);
	reduceIdenticalReporters(result);
	return Object.freeze(result);
};

function validate(config) {
	//	validate reporters
	if (!Array.isArray(config.reporters) || config.reporters.some(r => !r || typeof r !== 'object')) {
		throw new Error(`test reporters MUST be an array of non-null objects; got ${config.reporters}`);
	}
	config.reporters.forEach(reporter => {
		if (!TEST_REPORTERS.includes(reporter.type)) {
			throw new Error(`reporter type MUST be a one of ${TEST_REPORTERS}; got ${reporter.type}`);
		}
		if (!reporter.path || typeof reporter.path !== 'string') {
			throw new Error(`reporter path MUST be a non-empty string; got ${reporter.path}`);
		}
	});

	//	validate include/exclude
	if (!Array.isArray(config.include) || !config.include.length) {
		throw new Error('"include" part of "tests" configuration MUST be a non-null nor-empty array');
	}
	if (!Array.isArray(config.exclude)) {
		throw new Error('"exclude" part of "tests" configuration MUST be a non-null array (may be empty)');
	}
}

function reduceIdenticalReporters(config) {
	const map = {};
	const toBeRemoved = config.reporters.filter(reporter => {
		const hash = reporter.type + reporter.path;
		if (hash in map) {
			logger.warn(`removing duplicate reporter (${JSON.stringify(reporter)})`);
			return true;
		} else {
			map[hash] = true;
			return false;
		}
	});
	for (const tbr of toBeRemoved) {
		config.reporters.splice(config.reporters.indexOf(tbr), 1);
	}
}