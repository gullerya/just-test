import { glob } from 'glob';
import Logger from '../logging/logger.ts';
import verifyEnrichConfig from './coverage-configurer.ts';
import { v8toJustTest } from './converters/v8-coverage-converter.ts';
import { filterV8Coverage } from './model/v8-coverage-filter.ts';
import lcovReporter from './reporters/lcov-reporter.ts';
import { Session } from '../testing/model/session.ts';

export {
	collectTargetSources,
	convertSessionCoverage,
	filterV8Coverage,
	lcovReporter,
	verifyEnrichConfig,
	v8toJustTest
};

const logger = new Logger({ context: 'coverage' });

async function collectTargetSources(config?: { include?: string; exclude?: string[] }): Promise<string[]> {
	if (!config || !config.include) {
		return [];
	}

	logger.info('collecting coverage targets...');
	const started = globalThis.performance.now();
	const result = await glob(config.include, {
		ignore: config.exclude ?? [],
		nodir: true
	});
	logger.info(`... collected ${result.length} coverage targets (${(globalThis.performance.now() - started).toFixed(1)}ms)`);
	return result;
}

/**
 * Walks a completed session and converts every raw-V8 coverage payload
 * (on each test's lastRun and on the session itself) into `just-test`
 * FileCov arrays. This is the single, host-side V8->jt conversion point;
 * child environments (node workers, browser iframes/pages) ship raw V8
 * over the wire, and conversion happens here, right before reporting.
 */
async function convertSessionCoverage(session: Session): Promise<void> {
	for (const suite of session.suites ?? []) {
		for (const test of suite.tests ?? []) {
			const run = test.lastRun;
			if (run && Array.isArray(run.coverage) && run.coverage.length) {
				run.coverage = await v8toJustTest(run.coverage);
			}
		}
	}
	if (Array.isArray(session.coverage) && session.coverage.length) {
		session.coverage = await v8toJustTest(session.coverage);
	}
}