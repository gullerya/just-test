/**
 * Runs a session of all suites/tests
 */
import { parseTestId } from '../common/interop-utils.js';
import { perfReady } from '../common/performance-utils.js';
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
	const P = await perfReady;
	const started = P.now();

	const executionData = stateService.getExecutionData();
	console.info(`starting test session (${executionData.suites.length} suites)...`);
	const suitePromises = executionData.suites.map(suite => runSuite(suite, sessionMetadata, stateService));
	await Promise.all(suitePromises);
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
	console.log(`suite '${suite.name}' started...`);
	await Promise.all(testPromises);
	console.log(`... suite '${suite.name}' done`);
}

async function runTest(test, sessionMetadata, stateService) {
	const [sid, tid] = parseTestId(test.id);
	const testRunBox = await deployTest(test, sessionMetadata);

	return new Promise(resolve => {
		testRunBox.runStarted.then(() => {
			stateService.updateRunStarted(sid, tid);
		});
		testRunBox.runEnded.then(async run => {
			stateService.updateRunEnded(sid, tid, run);
			resolve();
		});
	});
}