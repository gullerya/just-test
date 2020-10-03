import './components/jt-control/jt-control.js';
import './components/jt-details/jt-details.js';
import { obtainSuite } from './suites-service.js';
import { EVENTS } from './utils.js';

//	main flow
//
loadDefs()
	.then(defs => {
		console.dir(defs.metadata);
		console.dir(defs.resources);

		initTestListener();

		return executeTests(defs.metadata, defs.resources);
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

//	functions defs
//
async function loadDefs() {
	const data = await Promise.all([
		fetch('/api/metadata'),
		fetch('/api/resources')
	]);
	if (!data[0].ok || !data[1].ok) {
		throw new Error(`failed to load tests data; metadata: ${data[0].status}, resources: ${data[1].status}`);
	}
	return {
		metadata: await data[0].json(),
		resources: await data[1].json()
	};
}

async function executeTests(testsMetadata, testsResources) {
	console.log(`importing ${testsResources.length} test resources...`);
	const importPromises = [];
	testsResources.forEach(tr => {
		importPromises.push(
			import(`/tests/${tr}`)
				.catch(e => {
					console.error(`failed to import '${tr}':`, e);
				})
		);
	});
	await Promise.all(importPromises);
	console.log('... done');
}

function initTestListener() {
	window.addEventListener('message', event => {
		if (event.origin !== document.location.origin) {
			throw new Error(`expected message for '${document.location.origin}', received one for '${event.origin}'`);
		}

		if (event.data.type === EVENTS.TEST_ADDED) {
			addTest(event.data, event.source);
		} else if (event.data.type === EVENTS.RUN_ENDED) {
			endTest(event.data);
		}
	});
}

function addTest(details, frame) {
	const suite = obtainSuite(details.suiteName);
	suite.addTest(details.meta, frame);
	suite.runTest(details.meta.name);
}

function endTest(details) {
	const suite = obtainSuite(details.suiteName);
	suite.endTest(details.testName, details.run);
}