/**
 * Runs a session of all suites/tests
 * - performs with the current environment (browser / node instance)
 */
import { parseTestId } from '../common/interop-utils.js';
import { P } from '../common/performance-utils.js';
import { deployTest } from './deploy-service.js';
import { stateService } from './state/state-service-factory.js';

export {
	runSession,
	runTest
}

/**
 * executes all relevant tests, according the the sync/async options
 * - performs any needed environment related adjustments
 * 
 * @param {object} sessionMetadata - session execution metadata
 * @returns Promise resolved with test results when all tests done
 */
async function runSession(sessionMetadata) {
	const started = P.now();

	const executionData = stateService.getExecutionData();
	console.info(`starting test session (${executionData.suites.length} suites)...`);
	if (!sessionMetadata.interactive) {
		setTimeout(() => {
			//	TODO: finalize the session, no further updates will be accepted
		}, sessionMetadata.tests.ttl);
		console.info(`session time out watcher set to ${sessionMetadata.tests.ttl}ms`);
	}
	await Promise.all(executionData.suites.map(suite => executeSuite(suite, sessionMetadata)));

	const ended = P.now();
	console.info(`... session done (${(ended - started).toFixed(1)}ms)`);
}

/**
 * executes single test end-to-end:
 * - deploys into relevant enviroment
 * - gets the TestRunBox of the deployed test run
 * - listens for the run events
 * - updates the model
 * - notifies suite for run end
 */
async function runTest(test, sessionMetadata) {
	const [sid, tid] = parseTestId(test.id);
	const testRunBox = await deployTest(test, sessionMetadata);

	return new Promise(resolve => {
		testRunBox.started.then(() => {
			stateService.updateRunStarted(sid, tid);
		});
		testRunBox.ended.then(run => {
			stateService.updateRunEnded(sid, tid, run);
			resolve();
		});
	});
}

async function executeSuite(suite, metadata) {
	const testPromises = [];
	let syncChain = Promise.resolve();
	suite.tests.forEach(test => {
		if (test.options.skip) {
			testPromises.push(Promise.resolve());
		} else {
			const runResultPromise = runTest(test, metadata);
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