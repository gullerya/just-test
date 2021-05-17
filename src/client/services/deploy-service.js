import { TestRunBox } from '../common/test-run.js';
import { getSuite } from '../common/suite-runner.js';

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
 * @param {object} sessionMetadata - current session environment
 * @returns {object: Promise} - promise to be resolved when test deployed
 */
function deployTest(test, sessionMetadata) {
	let deployPromise;
	if (sessionMetadata.interactive) {
		deployPromise = executeInFrame(test);
	} else if (sessionMetadata.browser) {
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

	const testRunBox = new TestRunBox(test);
	i.onload = () => {
		i.contentWindow.getSuite = getSuite.bind(testRunBox);
		injectTestIntoDocument(i.contentDocument, test.source);
		i.onload = null;
	};
	d.body.appendChild(i);

	return Promise.resolve(testRunBox);
}

function executeInPage(test) {
	const w = globalThis.open('', test.id);
	const testRunBox = new TestRunBox(test);
	w.getSuite = getSuite.bind(testRunBox);

	const base = w.document.createElement('base');
	base.href = globalThis.location.origin;
	w.document.head.appendChild(base);

	injectTestIntoDocument(w.document, test.source);
	testRunBox.ended.then(w.close);
	return Promise.resolve(testRunBox);
}

function executeInNodeJS(test) {
	throw new Error(`unsupported yet environment to run ${test.id} from ${test.source}`);
}

function injectTestIntoDocument(envDocument, testSource) {
	const s = envDocument.createElement('script');
	s.type = 'module';
	s.src = `/tests/${testSource}`;
	envDocument.head.appendChild(s);
}