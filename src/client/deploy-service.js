import { INTEROP_NAMES } from '/core/common/constants.js';
import { TestRunBox } from './om/test-run.js';
import { getSuite } from './om/suite-runner.js';

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
	if (sessionMetadata.interactive || sessionMetadata.browser.type === 'firefox') {
		deployPromise = executeInFrame(test);
	} else if (sessionMetadata.browser) {
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
	const d = globalThis.document;

	let f = lookupEnv(test.id);
	if (!f) {
		f = d.createElement('iframe');
		f.name = test.id;
		f.classList.add('just-test-execution-frame');
	}
	f.srcdoc = '';

	const testRunBox = new TestRunBox(test);
	f.onload = () => {
		f.contentWindow.getSuite = getSuite.bind(testRunBox);
		injectTestIntoDocument(f.contentDocument, test.source);
		f.onload = null;
	};
	d.body.appendChild(f);

	return Promise.resolve(testRunBox);
}

async function executeInPage(test) {
	const w = globalThis.open('', test.id);
	const toCoverage = Boolean(w[INTEROP_NAMES.START_COVERAGE_METHOD]);
	const testRunBox = new TestRunBox(test, toCoverage);
	w.getSuite = getSuite.bind(testRunBox);

	const base = w.document.createElement('base');
	base.href = globalThis.location.origin;
	w.document.head.appendChild(base);

	if (toCoverage) {
		await w[INTEROP_NAMES.START_COVERAGE_METHOD](test.id);
	}
	injectTestIntoDocument(w.document, test.source);
	testRunBox.ended.then(async () => {
		if (toCoverage) {
			const coverage = await w[INTEROP_NAMES.TAKE_COVERAGE_METHOD](test.id);
			testRunBox.resolveCoverage(coverage);
		}
		w.close();
	});
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