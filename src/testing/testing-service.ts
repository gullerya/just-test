import { glob } from 'glob';
import Logger from '../logging/logger.ts';
import buildConfig from './testing-configurer.ts';
import xUnitReporter from './reporters/xunit-reporter.ts';

export {
	CONSTANTS,
	collectTestResources,
	verifyEnrichConfig,
	xUnitReporter
};

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
	const started = globalThis.performance.now();
	const result = await glob(include, {
		ignore: exclude,
		nodir: true
	});
	logger.info(`... collected ${result.length} test resource/s (${(globalThis.performance.now() - started).toFixed(1)}ms)`);
	if (result.length === 0) {
		throw new Error(`no test files matched include=${JSON.stringify(include)} exclude=${JSON.stringify(exclude)}`);
	}
	return result;
}
