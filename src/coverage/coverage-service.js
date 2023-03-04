import Logger from '../server/logger/logger.js';
import buildConfig from './coverage-configurer.js';
import { v8toJustTest } from './converters/v8-coverage-converter.js';
import lcovReporter from './reporters/lcov-reporter.js';
import glob from 'glob';

export {
	collectTargetSources,
	lcovReporter,
	verifyEnrichConfig,
	v8toJustTest
}

const logger = new Logger({ context: 'coverage' });

/**
 * process, validate and enrich by defaults the provided configuration
 * - provided environment is taken into consideration
 */
function verifyEnrichConfig(coverageConfig, environment) {
	return buildConfig(coverageConfig, environment);
}

async function collectTargetSources(config) {
	if (!config || !config.include) {
		return [];
	}

	logger.info('collecting coverage targets...');
	const started = globalThis.performance.now();
	const result = await glob(config.include, {
		ignore: config.exclude,
		nodir: true
	});
	logger.info(`... collected ${result.length} coverage targets (${(globalThis.performance.now() - started).toFixed(1)}ms)`);
	return result;
}