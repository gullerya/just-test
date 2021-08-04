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
 * executes all relevant tests, according the the sync/async config
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

async function runSuite(suite, sessionMetadata, stateService) {
	const testPromises = [];
	let syncChain = Promise.resolve();
	suite.tests.forEach(test => {
		if (test.config.skip) {
			testPromises.push(Promise.resolve());
		} else {
			const runResultPromise = runTest(test, sessionMetadata, stateService);
			if (test.config.sync) {
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
	const testRunBox = await deployTest(
		{ id: test.id, source: test.source, config: Object.assign({}, test.config) },
		sessionMetadata);

	return new Promise(resolve => {
		testRunBox.runStarted.then(testId => {
			const [sid, tid] = parseTestId(testId);
			stateService.updateRunStarted(sid, tid);
		});
		testRunBox.runEnded.then(({ testId, runResult }) => {
			const [sid, tid] = parseTestId(testId);
			stateService.updateRunEnded(sid, tid, runResult);
			resolve();
		});
	});
}