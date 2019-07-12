import * as DataTier from './libs/data-tier/data-tier.min.js';
import { Suite } from './suite.js';

export {
	createSuite
}

const
	initParams = {},
	model = DataTier.ties.create('justTestSuites', {
		passed: 0,
		failed: 0,
		skipped: 0,
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
if (!initParams['headless'] && !document.querySelectorAll('just-test-view').length) {
	import('./just-test-view.js');
	const justTestView = document.createElement('just-test-view');
	if (initParams.minimized) {
		justTestView.classList.add('minimized');
	}
	document.body.appendChild(justTestView);
}

document.addEventListener('justTestSuiteFinished', suiteFinishedEvent => {
	model.passed += suiteFinishedEvent.detail.passed;
	model.failed += suiteFinishedEvent.detail.failed;
	model.skipped += suiteFinishedEvent.detail.skipped;
});

function createSuite(options) {
	var s = new Suite(options);
	model.suites.push(s);
	return model.suites[model.suites.length - 1];
}