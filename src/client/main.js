import './components/jt-control/jt-control.js';
import './components/jt-details/jt-details.js';
import { getUnSourced } from './services/state-service.js';
import { execute } from './services/tests-executor.js';

//	main flow
//
loadMetadata()
	.then(async metadata => {
		await collectTests(metadata.testPaths);
		return metadata;
	})
	.then(metadata => {
		return executeTests(metadata.settings);
	})
	.then(r => {
		//	report results here
		console.dir(r);
	})
	.catch(e => {
		console.error(e);
	})
	.finally(() => {
		console.info('all done');
	});

/**
 * Fetches test session definitions
 * TODO: switch to a single API and do it as a session API (even include some session ID already)
 * 
 * @returns {Object} definitions fetched
 */
async function loadMetadata() {
	const started = performance.now();
	console.info(`fetching test session metadata...`);

	const mdResponse = await fetch('/api/v1/sessions/x/metadata');
	if (!mdResponse.ok) {
		throw new Error(`failed to load metadata; status: ${mdResponse.status}`);
	}
	const metadata = await mdResponse.json();

	console.info(`... metadata fetched (${(performance.now() - started).toFixed(1)}ms)`);
	return metadata;
}

/**
 * Imports suites/tests metadata
 * - has a side effect of collecting suites/tests metadata in the state service
 * 
 * @param {string[]} testsResources - array of paths
 */
async function collectTests(testsResources) {
	const started = performance.now();
	console.info(`fetching ${testsResources.length} test resource/s...`);

	testsResources.forEach(async tr => {
		try {
			await import(`/tests/${tr}`);
			getUnSourced().forEach(t => t.source = tr);
		} catch (e) {
			console.error(`failed to import '${tr}':`, e);
		}
	});

	console.info(`... test resources fetched (${(performance.now() - started).toFixed(1)}ms)`);
}

/**
 * Executes all suites/tests of the current session
 * 
 * @param {object} metadata - session metadata
 */
async function executeTests(metadata) {
	console.log(metadata);
	return await execute(metadata);
}

// function initTestListener() {
// 	window.addEventListener('message', event => {
// 		if (event.origin !== document.location.origin) {
// 			throw new Error(`expected message for '${document.location.origin}', received one for '${event.origin}'`);
// 		}

// 		if (event.data.type === EVENTS.TEST_ADDED) {
// 			addTest(event.data, event.source);
// 		} else if (event.data.type === EVENTS.RUN_ENDED) {
// 			endTest(event.data);
// 		}
// 	});
// }