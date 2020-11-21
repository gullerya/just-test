import fs from 'fs';
import { performance } from 'perf_hooks';
import glob from 'glob';
import Logger from '../logger/logger.js';
import buildConfig from './testing-service-config.js';

export {
	CONSTANTS,
	getTestingService
}

const
	logger = new Logger({ context: 'tester' }),
	CONSTANTS = Object.freeze({
		TESTS_METADATA: 'testsMetadata'
	});

let testingServiceInstance;

class TestsService {
	verifyEnrichConfig(testingConfig, clArguments) {
		return buildConfig(testingConfig, clArguments);
	}

	async collectTestResources() {
		logger.info('collecting test resources...');
		const
			started = performance.now(),
			options = {
				nodir: true,
				nosort: true,
				ignore: this.effectiveConfig.exclude
			},
			promises = [];
		this.effectiveConfig.include.forEach(i => {
			promises.push(new Promise(resolve => {
				glob(i, options, (err, matches) => {
					if (err) {
						logger.error(`failed to collect test resources: ${err}`);
						resolve([]);
					} else {
						resolve(matches);
					}
				})
			}));
		});
		const result = (await Promise.all(promises)).reduce((a, c) => {
			a.push(...c);
			return a;
		}, []);
		logger.info(`... test resources collected in ${Math.floor(performance.now() - started)}ms`);
		logger.info(`collected ${result.length} test resources:`);
		logger.info(result);
		return result;
	}

	async report(page, conf, reportPath) {
		//	wait for tests to finish
		await this.waitTestsToFinish(page, conf.ttl);

		//	write full report
		logger.info();
		logger.info('obtaining full report...');
		const fullReport = await page.evaluate(() => {
			return document.querySelector('just-test-view').generateXUnitReport();
		});
		if (fullReport) {
			fs.writeFileSync(reportPath, fullReport);
		}
		logger.info('... full report written ("' + conf.format + '" format)');

		//	extract principal results
		logger.info();
		logger.info('obtaining test results...');
		const results = await page.evaluate(() => {
			const mAsJson = document.querySelector('just-test-view').results;
			return JSON.parse(JSON.stringify(mAsJson));
		});
		logger.info('... test results summary:');
		logger.info(results.passed.toString().padStart(7) + ' passed');
		logger.info(results.failed.toString().padStart(7) + ' failed');
		logger.info(results.skipped.toString().padStart(7) + ' skipped');

		if (results.failed) {
			logger.info();
			results.suites
				.filter(s => s.failed)
				.forEach(s => {
					s.tests
						.filter(t => t.status === 4 || t.status === 5)
						.forEach(t => {
							logger.info('Test ' + (t.status === 4 ? 'FAILURE' : 'ERROR') + ':');
							logger.info('\tTest: ' + t.name);
							logger.info('\tSuite: ' + s.name);
							logger.info('\tError: ' + t.error.type + ' - ' + (t.error.message ? t.error.message : 'no message'));
						});
				});
		}

		const statusPass = results.failed <= conf.maxFail && results.skipped <= conf.maxSkip;
		const result = {
			passed: results.passed,
			failed: results.failed,
			skipped: results.skipped,
			statusPass: statusPass,
			statusText: statusPass
				? 'SUCCESS' + (results.failed || results.skipped ? ' (with allowed no. of fails/skips)' : '')
				: 'FAILURE'
		}

		return result;
	}

	async waitTestsToFinish(page, ttl) {
		const started = performance.now();
		let testsDone = false;

		logger.info();
		logger.info('waiting for tests to finish (max TTL set to ' + Math.floor(ttl / 1000) + 's)...');
		do {
			testsDone = await page.evaluate(() => {
				const jtv = document.querySelector('just-test-view');
				return jtv && jtv.results && typeof jtv.results === 'object';
			});

			const currentTL = performance.now() - started;
			if (testsDone) {
				logger.info('... tests run finished in ' + Math.floor(currentTL / 1000) + 's');
			} else if (currentTL > ttl) {
				logger.error('... max tests run TTL was set to ' + ttl + 'ms, but already passed ' + Math.floor(currentTL / 1000) + 's - abandoning')
				throw new Error('tests run timed out after ' + Math.floor(currentTL / 1000) + 's');
			}

			await new Promise(r => r(), 2000);
		} while (!testsDone);
	}
}

function getTestingService(testsConfig) {
	if (!testingServiceInstance) {
		testingServiceInstance = new TestsService(testsConfig);
	}
	return testingServiceInstance;
}
