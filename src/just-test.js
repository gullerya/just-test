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
	const s = new Suite(options, model);
	s.addEventListener('testAdded', () => {
		model.total++;
	});
	s.addEventListener('testFinished', tfe => {
		if (tfe.detail.status === STATUSES.PASSED) {
			model.passed++;
		} else if (tfe.detail.status === STATUSES.FAILED || tfe.detail.status === STATUSES.ERRORED) {
			model.failed++;
		} else if (tfe.detail.status === STATUSES.SKIPPED) {
			model.skipped++;
		}
		model.done++;
	});
	model.suites.push(s);
	return s;
}