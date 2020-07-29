import * as DataTier from '/libs/data-tier/dist/data-tier.min.js';
import { constants } from './utils.js';
import './components/jt-control/jt-control.js';
import './components/jt-details/jt-details.js';

const
	suites = {},
	model = DataTier.ties.create('justTestModel', {
		passed: 0,
		failed: 0,
		skipped: 0,
		total: 0,
		done: 0,
		suites: []
	});

start();

async function start() {
	//	load tests data
	const data = await Promise.all([
		fetch('/api/tests/metadata'),
		fetch('/api/tests/resources')
	]);
	if (!data[0].ok || !data[1].ok) {
		throw new Error(`failed to load tests data; metadata: ${data[0].status}, resources: ${data[1].status}`);
	}

	initTestListener();

	//	init test frames
	const testsMetadata = await data[0].json();
	const testsResources = await data[1].json();
	await initTestFrames(testsMetadata, testsResources);

	//	TODO: to be removed
	console.dir(testsMetadata);
}

async function initTestFrames(testsMetadata, testsResources) {
	testsResources.forEach(tr => {
		const testFrame = document.createElement('iframe');

		if (tr.endsWith('.js')) {
			testFrame.addEventListener('load', () => {
				const s = testFrame.contentDocument.createElement('script');
				s.type = 'module';
				s.src = '/tests/resources/' + tr;
				testFrame.contentDocument.body.appendChild(s);
			});
			testFrame.src = './test-frame.html';
		} else if (tr.endsWith('.htm') || tr.endsWith('.html')) {
			testFrame.src = tr;
		} else {
			console.error(`unsupported test resource type '${tr}', only '.js', '.htm/.html' are supported`);
		}

		document.querySelector('.just-test-details').appendChild(testFrame);
	});
}

function initTestListener() {
	window.addEventListener('message', event => {
		if (event.origin !== document.location.origin) {
			throw new Error(`expected message for '${document.location.origin}', received one for '${event.origin}'`);
		}

		if (event.data.type === constants.TEST_ADDED_EVENT) {
			model.total++;
		} else if (event.data.type === constants.TEST_ENDED_EVENT) {
			model.done++;
		} else {
			console.error(`unexpected message of type '${event.data.type}'`);
		}

		postRunTest(event.data.suiteName, event.data.testOptions.name, event.source);
	});
}

function postRunTest(suite, test, testFrame) {
	testFrame.postMessage({
		type: constants.TEST_RUN_ACTION, suiteName: suite, testName: test
	}, document.location.origin);
}