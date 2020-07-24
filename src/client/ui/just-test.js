import * as DataTier from '/libs/data-tier/dist/data-tier.min.js';
import { STATUSES, RANDOM_CHARSETS } from './test.js';
import { Suite } from './suite.js';

import './components/jt-control/jt-control.js';
import './components/jt-details/jt-details.js';

start();

async function start() {
	const data = await Promise.all([
		fetch('/api/tests/metadata'),
		fetch('/api/tests/resources')
	])

	if (data[0].ok) {
		const testsMetadata = await data[0].json();
	}

	if (data[1].ok) {
		const testsResources = await data[1].json();
		testsResources.forEach(tr => {
			//	create iframe
			const dc = document.createElement('iframe');
			dc.src = './test-frame.html';
			document.body.appendChild(dc);

			dc.addEventListener('load', () => {
				const s = dc.contentDocument.createElement('script');
				s.type = 'module';
				s.src = '/tests/resources/' + tr;
				dc.contentDocument.body.appendChild(s);
			});
		});
	}
}

export {
	getSuite,
	RANDOM_CHARSETS
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