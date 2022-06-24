import Logger from '../server/logger/logger.js';

//	TOOD: do reporters as a separate module, each with it's own registration routine + extensibility

const
	logger = new Logger({ context: 'testing configurer' }),
	TEST_REPORTS_FORMATS = ['xUnit'],
	DEFAULT_CONFIG = Object.freeze({
		ttl: 1000 * 60,
		maxFail: 0,
		maxSkip: 0,
		include: [],
		exclude: [],
		reports: [
			{ format: 'xUnit', path: './reports/test-results.xml' }
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
	_reduceIdenticalReports(result);
	return Object.freeze(result);
};

function validate(config) {
	//	validate reports
	if (!Array.isArray(config.reports) || config.reports.some(r => !r || typeof r !== 'object')) {
		throw new Error(`test reporters MUST be an array of non-null objects; got ${config.reports}`);
	}
	config.reports.forEach(report => {
		if (!TEST_REPORTS_FORMATS.includes(report.format)) {
			throw new Error(`reporter type MUST be a one of ${TEST_REPORTS_FORMATS}; got ${report.format}`);
		}
		if (!report.path || typeof report.path !== 'string') {
			throw new Error(`reporter path MUST be a non-empty string; got ${report.path}`);
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

function _reduceIdenticalReports(config) {
	const map = {};
	const toBeRemoved = config.reports.filter(report => {
		const hash = report.format + report.path;
		if (hash in map) {
			logger.warn(`removing duplicate report (${JSON.stringify(report)})`);
			return true;
		} else {
			map[hash] = true;
			return false;
		}
	});
	for (const tbr of toBeRemoved) {
		config.reports.splice(config.reports.indexOf(tbr), 1);
	}
}