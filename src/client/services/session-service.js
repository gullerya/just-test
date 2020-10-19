/**
 * Runs a session of all suites/tests
 * - performs with the current environment (browser / node instance)
 */
import { getStateService } from './state/state-service-factory.js';
import { deployTest } from './deploy/deploy-service.js';
import { EVENTS } from '../utils.js'

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
	ensureTestListener(metadata);

	const stateService = await getStateService();
	const executionData = stateService.getExecutionData();

	if (metadata.currentEnvironment.interactive) {
		await Promise.all(executionData.suites.map(suite => executeSuite(suite, metadata)));
	} else {
		console.info(`setting global time out watcher to ${metadata.settings.ttl}ms`);
		setTimeout(() => {
			//	TODO: finalize the session, no further updates will be accepted
			//	fs non-interactive - send shut down signal
		}, metadata.settings.ttl);
		throw new Error('automated execution is not yet supported');
	}

	console.log('session done');
}

async function executeSuite(suite, metadata) {
	const testPromises = [];
	let syncChain = Promise.resolve();
	suite.tests.forEach(test => {
		const testId = `${suite.name}|${test.name}`;
		if (test.options.skip) {
			testPromises.push(Promise.resolve());
		} else if (!test.options.sync) {
			testPromises.push(deployTest(testId, test.source, metadata.currentEnvironment));
		} else {
			syncChain = syncChain.finally(() => deployTest(testId, test.source, metadata.currentEnvironment));
		}
	});
	testPromises.push(syncChain);
	await Promise.all(testPromises);
}

const testEventsBus = getTestEventsBus();
let testListenerInstalled = false;

export async function ensureTestListener() {
	if (testListenerInstalled) {
		return;
	} else {
		testListenerInstalled = true;
	}
	testEventsBus.addEventListener(EVENTS.RUN_STARTED, e => {
		console.log(`started ${JSON.stringify(e.detail)}`);
	});
	testEventsBus.addEventListener(EVENTS.RUN_ENDED, e => {
		console.log(`ended ${JSON.stringify(e.detail)}`);
	});
}

function getTestEventsBus() {
	if (globalThis.window) {
		let tmp = globalThis.window;
		while (tmp.parent && tmp.parent !== tmp) tmp = tmp.parent;
		return tmp.opener ? tmp.opener : tmp;
	} else {
		throw new Error('NodeJS is not yet supported');
	}
}