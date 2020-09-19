import './components/jt-control/jt-control.js';
import './components/jt-details/jt-details.js';
import { obtainSuite } from './suites-service.js';
import { constants } from './utils.js';

start();

async function start() {
	const { metadata, resources } = await loadDefs();

	console.log('TO BE REMOVED');
	console.dir(metadata);

	initTestListener();

	await initTests(metadata, resources);
}

async function loadDefs() {
	const data = await Promise.all([
		fetch('/api/tests/metadata'),
		fetch('/api/tests/resources')
	]);
	if (!data[0].ok || !data[1].ok) {
		throw new Error(`failed to load tests data; metadata: ${data[0].status}, resources: ${data[1].status}`);
	}
	return {
		metadata: await data[0].json(),
		resources: await data[1].json()
	};
}

async function initTests(testsMetadata, testsResources) {
	console.log(`importing ${testsResources.length} test resources...`);
	const importPromises = [];
	testsResources.forEach(tr => {
		importPromises.push(
			import(`/tests/resources/${tr}`)
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

		if (event.data.type === constants.TEST_ADDED_EVENT) {
			addTest(event.data, event.source);
		} else if (event.data.type === constants.TEST_ENDED_EVENT) {
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