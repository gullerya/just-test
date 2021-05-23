/**
 * Runs a session of all suites/tests
 */
import { parseTestId } from '../common/interop-utils.js';
import { P } from '../common/performance-utils.js';
import { deployTest } from './deploy-service.js';

export {
	runSession,
	runSuite,
	runTest
}

/**
 * executes all relevant tests, according the the sync/async options
 * - performs any needed environment related adjustments
 * 
 * @param {object} sessionMetadata - session execution metadata
 * @param {object} stateService - state service to accumulate result to
 * @returns Promise resolved with test results when all tests done
 */
async function runSession(sessionMetadata, stateService) {
	const started = P.now();

	const executionData = stateService.getExecutionData();
	console.info(`starting test session (${executionData.suites.length} suites)...`);
	if (!sessionMetadata.interactive) {
		setTimeout(() => {
			//	TODO: finalize the session, no further updates will be accepted
		}, sessionMetadata.tests.ttl);
		console.info(`session time out watcher set to ${sessionMetadata.tests.ttl}ms`);
	}
	await Promise.all(executionData.suites.map(suite => runSuite(suite, sessionMetadata, stateService)));

	const ended = P.now();
	console.info(`... session done (${(ended - started).toFixed(1)}ms)`);
}

async function runSuite(suite, metadata, stateService) {
	const testPromises = [];
	let syncChain = Promise.resolve();
	suite.tests.forEach(test => {
		if (test.options.skip) {
			testPromises.push(Promise.resolve());
		} else {
			const runResultPromise = runTest(test, metadata, stateService);
			if (test.options.sync) {
				syncChain = syncChain.finally(() => runResultPromise);
			} else {
				testPromises.push(runResultPromise);
			}
		}
	});
	testPromises.push(syncChain);
	await Promise.all(testPromises);
}

async function runTest(test, sessionMetadata, stateService) {
	const [sid, tid] = parseTestId(test.id);
	const testRunBox = await deployTest(test, sessionMetadata);

	return new Promise(resolve => {
		testRunBox.started.then(() => {
			stateService.updateRunStarted(sid, tid);
		});
		testRunBox.ended.then(async run => {
			if (testRunBox.coveragePromise) {
				run.coverage = await testRunBox.coveragePromise;
			}
			stateService.updateRunEnded(sid, tid, run);
			resolve();
		});
	});
}