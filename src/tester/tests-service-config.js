import configurer from '../configurer.js';

const
	testReportFormats = 'xUnit',
	defaultConfig = Object.freeze({
		ttl: 30000,
		maxFail: 0,
		maxSkip: 0,
		include: [],
		exclude: [],
		reports: [
			{ path: './reports/test-results.xml', format: 'xUnit' }
		]
	});

export default () => {
	const result = configurer.mergeConfig(defaultConfig, configurer.givenConfig.tests);
	validate(result);
	return Object.freeze(result);
};

function validate(config) {
	//	validate reports
	if (!Array.isArray(config.reports) || config.reports.some(r => !r || typeof r !== 'object')) {
		throw new Error(`test reports MUST be an array of non-null objects; got ${config.reports}`);
	}
	config.reports.forEach(report => {
		if (!report.path || typeof report.path !== 'string') {
			throw new Error(`tests report path MUST be a non-empty string; got ${report.path}`);
		}
		if (!testReportFormats.includes(report.format)) {
			throw new Error(`tests report format MUST be a one of ${testReportFormats}; got ${report.format}`);
		}
	});

	//	validate include/exclude
	if (!Array.isArray(config.include)) {
		throw new Error('"include" part of "tests" configuration MUST be a non-null array');
	}
	if (!Array.isArray(config.exclude)) {
		throw new Error('"exclude" part of "tests" configuration MUST be a non-null array');
	}
}