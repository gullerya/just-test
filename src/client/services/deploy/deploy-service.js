/**
 * deploys a single test within a given environment
 * - in the browser non-interactive context injects the test into the newly created page
 * - in the browder interactive context injects the test into the newly created frame
 * - in NodeJS context injects the test into a NodeJS fork
 * 
 * @param {object} currentEnvironment - current envoronment
 */
export function deployTest(testId, testSource, currentEnvironment) {
	if (currentEnvironment.browser) {
		if (currentEnvironment.interactive) {
			injectIntoPage(testId, testSource);
		} else {
			injectIntoPage(testId, testSource);
		}
	} else {
		throw new Error('unsupported yet environment');
	}
}

function injectIntoPage(testId, testSource) {
	const w = globalThis.open('services/deploy/browser/browser-test-runner.html');
	w.onload = event => {
		injectTestExecutionAPIs(w, testId);
		injectTest(event.target, testSource);
	};
}

function injectInfoFrame(testId, testSource) {
	const d = globalThis.document;
	const i = d.createElement('iframe');
	i.classList.add('just-test-execution-frame');
	i.src = 'services/deploy/browser/browser-test-runner.html';
	i.onload = event => {
		injectTestExecutionAPIs(event.target.contentWindow, testId);
		injectTest(event.target.contentDocument, testSource);
	};
	d.body.appendChild(i);
}

function injectTestExecutionAPIs(targetWindow, testToRunId) {
	let interopAPIs = targetWindow['interop'];
	if (!interopAPIs) {
		interopAPIs = {
			tests: {}
		};
		targetWindow['interop'] = interopAPIs;
	}
	interopAPIs.tests[testToRunId] = {};
}

function injectTest(document, testSource) {
	const s = document.createElement('script');
	s.type = 'module';
	s.src = `/tests/${testSource}`;
	document.head.appendChild(s);
}
