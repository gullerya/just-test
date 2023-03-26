const
	COVERAGE_SUPPORTING_BROWSERS = ['chromium'],
	COVERAGE_TYPES = ['lcov'],
	DEFAULT_CONFIG = Object.freeze({
		include: [],
		exclude: [
			'*.min.js'
		],
		reports: [
			{ type: 'lcov' }
		]
	});

export default (coverageConfig, environment) => {
	if (!coverageConfig) {
		return DEFAULT_CONFIG;
	}
	validate(coverageConfig, environment);

	const result = {};
	result.include = Array.isArray(coverageConfig.include)
		? DEFAULT_CONFIG.include.concat(coverageConfig.include)
		: DEFAULT_CONFIG.include;
	result.exclude = Array.isArray(coverageConfig.exclude)
		? DEFAULT_CONFIG.exclude.concat(coverageConfig.exclude)
		: DEFAULT_CONFIG.exclude;
	result.reports = Array.isArray(coverageConfig.reports)
		? coverageConfig.reports
		: DEFAULT_CONFIG.reports;

	return Object.freeze(result);
};

function validate(config, environment) {
	//	validate self
	if (config && typeof config !== 'object') {
		throw new Error(`coverage config, if/when defined, MUST be a non-null object`);
	}

	//	validate against environment
	if (!environment?.node && !COVERAGE_SUPPORTING_BROWSERS.includes(environment.browser?.type)) {
		throw new Error(`coverage supported ONLY in 'nodejs' or [${COVERAGE_SUPPORTING_BROWSERS.join(', ')}]`);
	}

	//	validate reports
	if (config.reports) {
		if (!Array.isArray(config.reports) || config.reports.some(r => !r || typeof r !== 'object')) {
			throw new Error(`coverage reports MUST be an array of non-null objects; got ${config.reports}`);
		}
		config.reports.forEach(report => {
			if (!COVERAGE_TYPES.includes(report.type)) {
				throw new Error(`coverage report type MUST be a one of [${COVERAGE_TYPES}]; got ${report.type}`);
			}
		});
	}

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