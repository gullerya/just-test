import { performance as P } from 'perf_hooks';
import glob from 'glob';
import Logger from '../logger/logger.js';
import buildConfig from './testing-configurer.js';

export {
	CONSTANTS,
	verifyEnrichConfig,
	collectTestResources
}

const
	logger = new Logger({ context: 'testing' }),
	CONSTANTS = Object.freeze({
		TESTS_METADATA: 'testsMetadata'
	});

function verifyEnrichConfig(testingConfig, clArguments) {
	return buildConfig(testingConfig, clArguments);
}

async function collectTestResources(include, exclude) {
	logger.info('collecting test resources...');
	const
		started = P.now(),
		options = { nodir: true, nosort: true, ignore: exclude },
		promises = [];
	for (const i of include) {
		promises.push(new Promise(resolve => {
			glob(i, options, (err, matches) => {
				if (err) {
					logger.error(`failed to collect test resources from '${i}': ${err}`);
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
	logger.info(`... collected ${result.length} test resources (${(P.now() - started).toFixed(1)}ms)`);
	logger.info(result);
	return result;
}
