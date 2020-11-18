/**
 * Runs a session of all suites/tests
 * - performs with the current environment (browser / node instance)
 */
import { EVENTS } from '../utils/interop-utils.js';
import { deployTest } from './deploy-service.js';
import { stateService } from './state/state-service-factory.js';

export {
	runSession
}

/**
 * executes all relevant tests, according the the sync/async options
 * - performs any needed environment related adjustments
 * 
 * @param {object} metadata - session execution metadata
 * @returns Promise resolved with test results when all tests done
 */
async function runSession(metadata) {
	const executionData = stateService.getExecutionData();
	console.info(`starting test session (${executionData.suites.length} suites)...`);

	if (!metadata.currentEnvironment.interactive) {
		setTimeout(() => {
			//	TODO: finalize the session, no further updates will be accepted
		}, metadata.settings.ttl);
		console.info(`session time out watcher set to ${metadata.settings.ttl}ms`);
	}
	await Promise.all(executionData.suites.map(suite => executeSuite(suite, metadata)));

	console.info('... session done');
}

async function executeSuite(suite, metadata) {
	const testPromises = [];
	let syncChain = Promise.resolve();
	suite.tests.forEach(test => {
		if (test.options.skip) {
			testPromises.push(Promise.resolve());
		} else {
			const runResultPromise = executeTest(test, metadata);
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

async function executeTest(test, metadata) {
	const runEnv = await deployTest(test, metadata.currentEnvironment);

	return new Promise(resolve => {
		runEnv.addEventListener(EVENTS.RUN_STARTED, e => {
			stateService.updateRunStarted(e.detail.suite, e.detail.test);
		}, { once: true });
		runEnv.addEventListener(EVENTS.RUN_ENDED, e => {
			stateService.updateRunEnded(e.detail.suite, e.detail.test, e.detail.run);
			resolve();
		}, { once: true });

	});
}