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
	const
		started = globalThis.performance.now(),
		options = { nodir: true, nosort: true, ignore: config.exclude },
		promises = [];
	for (const i of config.include) {
		promises.push(new Promise(resolve => {
			glob(i, options, (err, matches) => {
				if (err) {
					logger.error(`failed to collect coverage targets from '${i}': ${err}`);
					resolve([]);
				} else {
					resolve(matches);
				}
			})
		}));
	}
	const result = (await Promise.all(promises)).reduce((a, c) => {
		a.push(...c);
		return a;
	}, []);
	logger.info(`... collected ${result.length} coverage targets (${(globalThis.performance.now() - started).toFixed(1)}ms)`);
	return result;
}