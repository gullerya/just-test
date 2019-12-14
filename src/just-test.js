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
	});

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
			document.body.appendChild(justTestView);
		});
}

function createSuite(options) {
	model.suites.push({
		name: options.name
	});

	const s = new Suite(model.suites[model.suites.length - 1]);

	s.addEventListener('testAdded', onTestAdded);
	s.addEventListener('testFinished', onTestFinished);
	s.addEventListener('finished', onSuiteFinished);

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