import { DEFAULT, INTEROP_NAMES, TESTBOX_ENVIRONMENT_KEYS } from '../common/constants.js';
import { ENVIRONMENT_TYPES, TestRunManager } from '../runner/ipc-service/ipc-service.js';
import { TestRunBox } from './om/test-run-box.js';
import { getSuite } from './om/suite-runner.js';

export {
	deployTest,
	lookupEnv
}

/**
 * deploys a single test within a given environment
 * - in the browser non-interactive context injects the test into the newly created page
 * - in the browser interactive context injects the test into the newly created frame
 * - in NodeJS context injects the test into a NodeJS fork
 * 
 * @param {object} test - test (metadata) to execute
 * @param {object} sessionMetadata - current session environment
 * @returns {object: Promise} - promise to be resolved when test deployed
 */
function deployTest(test, sessionMetadata) {
	let deployPromise;
	if (sessionMetadata.interactive || sessionMetadata.browser?.type === 'firefox') {
		deployPromise = executeInFrame(test);
	} else if (sessionMetadata.browser) {
		deployPromise = executeInPage(test);
	} else if (sessionMetadata.node === true) {
		deployPromise = executeInNodeJS(test);
	} else {
		throw new Error(`unexpected configuration ${JSON.stringify(sessionMetadata)}`);
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
		f.classList.add('just-test-execution-frame');
	}
	f.src = `about:blank?${TESTBOX_ENVIRONMENT_KEYS.TEST_ID}=${encodeURIComponent(test.id)}`;

	//	here consume IPC service and use it to bind this window with the frame's window
	let testRunManager;

	//	const testRunBox = new TestRunBox(test);
	f.onload = () => {
		// f.contentWindow.getSuite = getSuite.bind(testRunBox);
		testRunManager = new TestRunManager(ENVIRONMENT_TYPES.BROWSER, f.contentWindow, {
			[test.id]: test
		});
		injectBrowserTestRunner(f.contentDocument, test.source);
		f.onload = null;
	};

	d.body.appendChild(f);

	return Promise.resolve(testRunManager);
}

async function executeInPage(test) {
	const w = globalThis.open('', '_blank');
	const isCoverage = Boolean(w[INTEROP_NAMES.REGISTER_TEST_FOR_COVERAGE]);
	if (isCoverage) {
		await w[INTEROP_NAMES.REGISTER_TEST_FOR_COVERAGE](test.id);
	}

	const testRunBox = new TestRunBox(test, isCoverage);
	const base = w.document.createElement('base');
	base.href = globalThis.location.origin;
	w.document.head.appendChild(base);
	w.getSuite = getSuite.bind(testRunBox);

	injectTestIntoDocument(w.document, test.source);
	testRunBox.runEnded.then(() => {
		w.close();
	});
	return Promise.resolve(testRunBox);
}

//	This one should create child process
async function executeInNodeJS(test) {
	const fork = (await import('node:child_process')).fork;
	const path = (await import('node:path')).default;

	const nodeEnv = fork(
		path.resolve('bin/runner/nodejs/test-box-nodejs.js'),
		[
			`${TESTBOX_ENVIRONMENT_KEYS.TEST_ID}=${test.id}`,
			`${TESTBOX_ENVIRONMENT_KEYS.TEST_URL}=${test.source}`
		],
		{
			timeout: DEFAULT.TEST_RUN_TTL
		}
	);
	nodeEnv.on('close', (...args) => {
		console.log(args);
		console.info('closed ' + test.id);
	});
	nodeEnv.on('error', e => { console.error(e); });
	//	TODO: create here TestBox that will listen to messages from process and interop with the suite runner	

	return Promise.resolve({
		runStarted: new Promise(() => { }),
		runEnded: new Promise(() => { })
	});
}

function injectTestIntoDocument(envDocument, testSource) {
	const s = envDocument.createElement('script');
	s.type = 'module';
	s.src = `/core/runner/environments/browser-test-runner.js`;
	envDocument.head.appendChild(s);
}

function injectBrowserTestRunner(envDocument) {
	const s = envDocument.createElement('script');
	s.type = 'module';
	s.src = `/core/runner/environments/browser-test-runner.js`;
	envDocument.head.appendChild(s);
}