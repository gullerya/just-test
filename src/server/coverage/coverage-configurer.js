import Logger from '../logger/logger.js';

const
	logger = new Logger({ context: 'coverage-configurer' }),
	COVERAGE_SUPPORTING_BROWSER = 'chromium',
	COVERAGE_FORMATS = ['lcov'],
	DEFAULT_CONFIG = Object.freeze({
		skip: false,
		include: [],
		exclude: [
			'*.min.js'
		],
		reports: [
			{ format: 'lcov', path: './reports/coverage.lcov' }
		]
	});

export default (coverageConfig, environment) => {
	if (coverageConfig === undefined) {
		return null;
	}
	if (!coverageConfig || typeof coverageConfig !== 'object') {
		throw new Error(`coverage config, if/when defined, MUST be a non-null object`);
	}
	if (!environment.browser) {
		throw new Error(`coverage supported ONLY in browser environement`);
	}
	if (environment.browser.type !== COVERAGE_SUPPORTING_BROWSER) {
		throw new Error(`coverage supported ONLY in '${COVERAGE_SUPPORTING_BROWSER}'`);
	}

	const result = Object.assign(
		{},
		DEFAULT_CONFIG,
		Object.entries(coverageConfig)
			.filter(([key]) => key in DEFAULT_CONFIG)
			.reduce((pv, [key, value]) => { pv[key] = value; return pv; }, {})
	);

	validate(result);
	return Object.freeze(result);
};

function validate(config) {
	//	validate reports
	if (!Array.isArray(config.reports) || config.reports.some(r => !r || typeof r !== 'object')) {
		throw new Error(`coverage reports MUST be an array of non-null objects; got ${config.reports}`);
	}
	config.reports.forEach(report => {
		if (!report.path || typeof report.path !== 'string') {
			throw new Error(`coverage report path MUST be a non-empty string; got ${report.path}`);
		}
		if (!COVERAGE_FORMATS.includes(report.format)) {
			throw new Error(`coverage report format MUST be a one of ${COVERAGE_FORMATS}; got ${report.format}`);
		}
	});

	//	validate include/exclude
	if (config.include) {
		if (!Array.isArray(config.include) || !config.include.length) {
			throw new Error('"include" part of "coverage" configuration MUST be a non-empty array');
		}
	}
	if (config.exclude) {
		if (!Array.isArray(config.exclude) || !config.exclude.length) {
			throw new Error('"exclude" part of "coverage" configuration MUST be a non-empty array');
		}
	}
}