/**
 * Runs a session of all suites/tests
 * - performs with the current environment (browser / node instance)
 */
import { getExecutionData } from './state-service.js';
import { ensureTestListener } from './test-executor.js';

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
	const executionData = getExecutionData();

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
		if (test.options.skip) {
			testPromises.push(Promise.resolve());
		} else if (!test.options.sync) {
			testPromises.push(eTest(suite, test, metadata));
		} else {
			syncChain = syncChain.finally(() => eTest(suite, test, metadata));
		}
	});
	testPromises.push(syncChain);
	await Promise.all(testPromises);
}

async function eTest(suite, test, metadata) {
	if (metadata.currentEnvironment.interactive) {
		const i = document.createElement('iframe');
		i.classList.add('just-test-execution-frame');
		i.src = 'test-executor-shell.html';
		i.onload = event => {
			const cw = event.target.contentWindow;
			cw.testIdToRun = `${suite.name}|${test.name}`;

			const cd = event.target.contentDocument;
			const s = cd.createElement('script');
			s.type = 'module';
			s.src = `/tests/${test.source}`;
			cd.head.appendChild(s);
		};
		document.body.appendChild(i);
		//	inject the test script and the top level APIs
		//	inject the env so that only the relevant test is running and also pushing back the result
	} else {
		throw new Error('unsupported environment');
	}
}