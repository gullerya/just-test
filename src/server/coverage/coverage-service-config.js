import { mergeConfig } from '../../configurer.js';

const
	coverageFormats = ['lcov'],
	defaultConfig = Object.freeze({
		skip: false,
		include: [
			'*'
		],
		exclude: [
			'*.min.js'
		],
		reports: [
			{ path: './reports/coverage.lcov', format: 'lcov' }
		]
	});

export default input => {
	const result = mergeConfig(defaultConfig, input);
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
		if (!coverageFormats.includes(report.format)) {
			throw new Error(`coverage report format MUST be a one of ${coverageFormats}; got ${report.format}`);
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