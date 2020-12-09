import { EVENTS } from '../common/constants.js';

export {
	deployTest,
	lookupEnv
}

/**
 * deploys a single test within a given environment
 * - in the browser non-interactive context injects the test into the newly created page
 * - in the browder interactive context injects the test into the newly created frame
 * - in NodeJS context injects the test into a NodeJS fork
 * 
 * @param {object} test - test (metadata) to execute
 * @param {object} currentEnvironment - current envoronment
 * @returns {object: Promise} - promise to be resolved when test deployed
 */
function deployTest(test, currentEnvironment) {
	let deployPromise;
	if (currentEnvironment.interactive) {
		deployPromise = executeInFrame(test);
	} else if (currentEnvironment.browser) {
		//	TODO: right now just having browsers means we are in a right browser context
		//	TODO: in some future we's probably like to do something with this part, but
		//	TODO: this requires passing to the client the environment/browser data
		deployPromise = executeInPage(test);
	} else {
		deployPromise = executeInNodeJS(test);
	}
	return deployPromise;
}

function lookupEnv(testId) {
	return globalThis.document.querySelector(`[name="${testId}"]`)
}

function executeInFrame(test) {
	const oldFrame = lookupEnv(test.id);
	oldFrame?.remove();

	const d = globalThis.document;
	const i = d.createElement('iframe');
	i.name = test.id;
	i.classList.add('just-test-execution-frame');
	i.src = 'env-browser/browser-test-runner.html';
	d.body.appendChild(i);
	return new Promise((resolve, reject) => {
		i.onload = () => {
			setupInteropsBrowser(i.contentWindow, test);
			injectTestIntoDocument(i.contentDocument, test.source);
			resolve(i.contentWindow);
		};
		i.onerror = reject;
	});
}

function executeInPage(test) {
	const w = globalThis.open('env-browser/browser-test-runner.html');
	return new Promise((resolve, reject) => {
		w.onload = () => {
			setupInteropsBrowser(w, test);
			injectTestIntoDocument(w.document, test.source);
			w.addEventListener(EVENTS.RUN_ENDED, w.close, { once: true });
			resolve(w);
		};
		w.onerror = reject;
	});
}

function executeInNodeJS(test) {
	throw new Error(`unsupported yet environment to run ${test.id} from ${test.source}`);
}

function setupInteropsBrowser(targetWindow, test) {
	const interopAPIs = targetWindow.interop || (targetWindow.interop = {
		tests: {}
	});
	interopAPIs.tests[test.id] = { options: test.options };
}

function injectTestIntoDocument(envDocument, testSource) {
	const s = envDocument.createElement('script');
	s.type = 'module';
	s.src = `/tests/${testSource}`;
	envDocument.head.appendChild(s);
}