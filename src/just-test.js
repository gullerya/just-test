import * as DataTier from './libs/data-tier/data-tier.min.js';
import { STATUSES } from './test.js';
import { Suite } from './suite.js';

export {
	createSuite
}

const
	initParams = {},
	model = DataTier.ties.create('justTestModel', {
		passed: 0,
		failed: 0,
		skipped: 0,
		total: 0,
		done: 0,
		suites: []
	}).model;

//  read init params
Array
	.from(new URL(import.meta.url).searchParams)
	.forEach(entryPair => {
		initParams[entryPair[0]] = entryPair[1]
	});

if (Object.keys(initParams).length) {
	console.info('JT: init params are as following');
	console.dir(initParams);
} else {
	console.info('JT: no init params found');
}

//	only if not explicitly required headless and not already created
if (!initParams.headless && !document.querySelectorAll('just-test-view').length) {
	import('./views/just-test-view.js')
		.then(() => {
			const justTestView = document.createElement('just-test-view');
			if (initParams.minimized) {
				justTestView.classList.add('minimized');
			}
			justTestView.dataset.tie = 'justTestModel';
			document.body.appendChild(justTestView);
		});
}

function createSuite(options) {
	const s = new Suite(options);
	model.suites.push({
		id: s.id,
		name: s.name,
		passed: 0,
		failed: 0,
		skipped: 0,
		tests: []
	});

	s.addEventListener('testAdded', onTestAdded);
	s.addEventListener('testFinished', onTestFinished);
	s.addEventListener('finished', onSuiteFinished);

	return s;
}

function onTestAdded(e) {
	const
		test = e.detail.test,
		suiteModel = model.suites.find(s => s.id === e.detail.suiteId);

	model.total++;
	suiteModel.tests.push({
		id: test.id,
		name: test.name,
		status: test.status
	});
}

function onTestFinished(e) {
	const
		test = e.detail.test,
		suiteModel = model.suites.find(s => s.id === e.detail.suiteId),
		testModel = suiteModel.tests.find(t => t.id === test.id);

	model.done++;
	if (test.status === STATUSES.PASSED) {
		model.passed++;
		suiteModel.passed++;
	} else if (test.status === STATUSES.FAILED || test.status === STATUSES.ERRORED) {
		model.failed++;
		suiteModel.failed++;
	} else if (test.status === STATUSES.SKIPPED) {
		model.skipped++;
		suiteModel.skipped++;
	}

	testModel.status = test.status;
	testModel.error = test.error;
	testModel.duration = test.duration;
}

function onSuiteFinished(e) {
	const
		suite = e.detail.suite,
		suiteModel = model.suites.find(s => s.id === suite.id);
	suiteModel.duration = stringifyDuration(suite.duration);
}

function stringifyDuration(duration) {
	let ds = '';
	if (duration > 99) ds = (duration / 1000).toFixed(1) + ' s' + String.fromCharCode(160);
	else if (duration > 59900) ds = (duration / 60000).toFixed(1) + ' m' + String.fromCharCode(160);
	else ds = duration.toFixed(1) + ' ms';
	return ds;
}