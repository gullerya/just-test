import * as DataTier from './libs/data-tier/data-tier.min.js';
import { STATUSES } from './test.js';
import { Suite } from './suite.js';
import './views/just-test-view.js';

export {
	getSuite,
	createSuite
}

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

//	only if not explicitly required headless and not already created
if (!document.querySelectorAll('just-test-view').length) {
	const justTestView = document.createElement('just-test-view');
	document.body.appendChild(justTestView);
}

function getSuite(options) {
	let s;

	s = suites[options.id];
	if (!s) {
		model.suites.push(options);
		s = new Suite(model.suites[model.suites.length - 1]);
		s.addEventListener('testAdded', onTestAdded);
		s.addEventListener('testFinished', onTestFinished);
		s.addEventListener('finished', onSuiteFinished);
		suites[s.id] = s;
	}

	return s;
}

function createSuite(options) {
	console.warn('deprecated API; will be removed in a few versions forth; please use "getSuite" instead');

	model.suites.push(options);

	const s = new Suite(model.suites[model.suites.length - 1]);

	s.addEventListener('testAdded', onTestAdded);
	s.addEventListener('testFinished', onTestFinished);
	s.addEventListener('finished', onSuiteFinished);
	suites[s.id] = s;

	return s;
}

function onTestAdded() {
	model.total++;
}

function onTestFinished(e) {
	const testResult = e.detail.result;

	model.done++;
	if (testResult === STATUSES.PASSED) {
		model.passed++;
	} else if (testResult instanceof Error || testResult === STATUSES.FAILED || testResult === STATUSES.ERRORED) {
		model.failed++;
	} else if (testResult === STATUSES.SKIPPED) {
		model.skipped++;
	}
}

function onSuiteFinished(e) {
	const suiteModel = e.detail.suiteModel;
	suiteModel.duration = stringifyDuration(suiteModel.duration);

	//	check if all done
	if (model.suites.every(s => s.done === s.tests.length)) {
		const jtv = document.querySelector('just-test-view');
		if (jtv) {
			jtv.results = model;
		}
	}
}

function stringifyDuration(duration) {
	let ds = '';
	if (duration > 99) ds = (duration / 1000).toFixed(1) + ' s' + String.fromCharCode(160);
	else if (duration > 59900) ds = (duration / 60000).toFixed(1) + ' m' + String.fromCharCode(160);
	else ds = duration.toFixed(1) + ' ms';
	return ds;
}