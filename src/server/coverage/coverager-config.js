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
		reportPath: './reports/coverage.lcov',
		reportFormat: 'lcov',
	});

export default input => {
	const result = mergeConfig(defaultConfig, input);
	validate(result);
	return result;
};

function validate(config) {
	if (!coverageFormats.includes(config.format)) {
		throw new Error(`coverage report format invalid; got '${config.reportFormat}', supported ${coverageFormats}`);
	}
	if (!config.reportPath) {
		throw new Error(`coverage report path invalid: '${config.reportPath}'`);
	}
	if (config.include) {
		if (!Array.isArray(config.include) || !config.include.length) {
			throw new Error('"include" part of "coverage" configuration, if provided, MUST be a non-empty array');
		}
	}
	if (config.exclude) {
		if (!Array.isArray(config.exclude) || !config.exclude.length) {
			throw new Error('"exclude" part of "coverage" configuration, if provided, MUST be a non-empty array');
		}
	}
}