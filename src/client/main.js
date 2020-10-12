import './components/jt-control/jt-control.js';
import './components/jt-details/jt-details.js';
import { getUnSourced } from './services/state-service.js';
import { EVENTS } from './utils.js';

//	main flow
//
loadDefs()
	.then(async defs => {
		console.dir(defs.metadata);			//	TODO: remove
		console.dir(defs.resources);		//	TODO: remove

		await collectTests(defs.resources);
		return defs;
	})
	.then(defs => {
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
	const data = await Promise.all([fetch('/api/metadata'), fetch('/api/resources')]);
	if (!data[0].ok || !data[1].ok) {
		throw new Error(`failed to load tests data; metadata: ${data[0].status}, resources: ${data[1].status}`);
	}
	const parsed = await Promise.all([data[0].json(), data[1].json()]);
	return { metadata: parsed[0], resources: parsed[1] };
}

async function collectTests(testsResources) {
	console.log(`importing ${testsResources.length} test resource/s...`);
	testsResources.forEach(async tr => {
		try {
			await import(`/tests/${tr}`);
			getUnSourced().forEach(t => t.source = tr);
		} catch (e) {
			console.error(`failed to import '${tr}':`, e);
		}
	});
	console.log('... import done');
}

async function executeTests(testsMetadata) {
	const interactive = testsMetadata.environments.some(e => e.interactive);
	if (interactive) {
		//	TODO: execute in frames
	} else {
		//	TODO: execure in pages
	}
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