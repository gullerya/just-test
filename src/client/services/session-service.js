/**
 * Runs a session of all suites/tests
 * - performs with the current environment (browser / node instance)
 */
import { deployTest } from './deploy/deploy-service.js';

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
async function runSession(executionData, metadata) {
	console.info(`starting test session (${executionData.suites.length} suites)...`);

	setTimeout(() => {
		//	TODO: finalize the session, no further updates will be accepted
		//	fs non-interactive - send shut down signal
	}, metadata.settings.ttl);
	console.info(`session time out watcher set to ${metadata.settings.ttl}ms`);

	if (metadata.currentEnvironment.interactive) {
		await Promise.all(executionData.suites.map(suite => executeSuite(suite, metadata)));
	} else {
		throw new Error('automated execution is not yet supported');
	}

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

			runResultPromise.then(r => console.log(r));
		}
	});
	testPromises.push(syncChain);
	await Promise.all(testPromises);
}

async function executeTest(test, metadata) {
	return await deployTest(test, metadata.currentEnvironment);
}