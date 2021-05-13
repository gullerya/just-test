import { EVENT } from '../common/constants.js';
import { getSuite } from '../env-browser/browser-test-runner.js';

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

//	TODO: reuse old frame (perf)
//	TODO: use provided frame (perf)
function executeInFrame(test) {
	const oldFrame = lookupEnv(test.id);
	oldFrame?.remove();

	const d = globalThis.document;
	const i = d.createElement('iframe');
	i.name = test.id;
	i.srcdoc = '';
	i.classList.add('just-test-execution-frame');

	const readyPromise = new Promise((resolve, reject) => {
		i.onload = () => {
			setupInteropsBrowser(i.contentWindow, test);
			injectTestIntoDocument(i.contentDocument, test.source);
			resolve(i.contentWindow);
		};
		i.onerror = reject;
	});

	d.body.appendChild(i);

	return readyPromise;
}

function executeInPage(test) {
	const w = globalThis.open('env-browser/browser-test-runner.html');
	return new Promise((resolve, reject) => {
		w.onload = () => {
			setupInteropsBrowser(w, test);
			injectTestIntoDocument(w.document, test.source);
			w.addEventListener(EVENT.RUN_END, w.close, { once: true });
			resolve(w);
		};
		w.onerror = reject;
	});
}

function executeInNodeJS(test) {
	throw new Error(`unsupported yet environment to run ${test.id} from ${test.source}`);
}

//	TODO: support reuse of the iframe container for multiple tests
function setupInteropsBrowser(targetWindow, test) {
	const scopedSuiteAPI = {
		tests: {
			[test.id]: { options: test.options }
		}
	};

	targetWindow.getSuite = getSuite.bind(scopedSuiteAPI);
}

function injectTestIntoDocument(envDocument, testSource) {
	const s = envDocument.createElement('script');
	s.type = 'module';
	s.src = `/tests/${testSource}`;
	envDocument.head.appendChild(s);
}