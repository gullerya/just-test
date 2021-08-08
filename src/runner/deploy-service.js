import { DEFAULT, INTEROP_NAMES, TESTBOX_ENVIRONMENT_KEYS } from '../common/constants.js';
import { ENVIRONMENT_TYPES, TestRunManager } from '../runner/ipc-service/ipc-service-nodejs.js';

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
	if (sessionMetadata.browser && sessionMetadata.browser?.type === 'chromium') {
		deployPromise = executeInPage(test);
	} else if (sessionMetadata.interactive || sessionMetadata.browser) {
		deployPromise = executeInFrame(test);
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
	const encTestId = encodeURIComponent(test.id);

	const d = globalThis.document;
	let f = lookupEnv(encTestId);
	if (!f) {
		f = d.createElement('iframe');
		f.name = encTestId;
		f.classList.add('just-test-execution-frame');
	}
	f.src = `/core/runner/environments/browser/browser-test-runner.html?${TESTBOX_ENVIRONMENT_KEYS.TEST_ID}=${encTestId}`;

	const { port1, port2 } = new MessageChannel();
	port1.start();
	const testRunManager = new TestRunManager(ENVIRONMENT_TYPES.BROWSER, port1, test);

	f.addEventListener('load', () => {
		f.contentWindow.postMessage(INTEROP_NAMES.IPC_HANDSHAKE, globalThis.location.origin, [port2]);
	}, { once: true });
	d.body.appendChild(f);

	return Promise.resolve(testRunManager);
}

async function executeInPage(test) {
	const encTestId = encodeURIComponent(test.id);

	const w = globalThis.open(globalThis.location.origin);

	const { port1, port2 } = new MessageChannel();
	port1.start();
	const testRunManager = new TestRunManager(ENVIRONMENT_TYPES.BROWSER, port1, test);

	w.addEventListener('load', () => {
		w.postMessage(INTEROP_NAMES.IPC_HANDSHAKE, globalThis.location.origin, [port2]);
	}, { once: true });
	w.location = `/core/runner/environments/browser/browser-test-runner.html?${TESTBOX_ENVIRONMENT_KEYS.TEST_ID}=${encTestId}`;

	testRunManager.runEnded.then(() => {
		w.close();
	});

	return Promise.resolve(testRunManager);
}

async function executeInNodeJS(test) {
	const fork = (await import('node:child_process')).fork;
	const path = (await import('node:path')).default;

	const nodeEnv = fork(
		path.resolve('bin/runner/environments/nodejs/nodejs-test-runner.js'),
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
	const testRunManager = new TestRunManager(ENVIRONMENT_TYPES.NODE_JS, nodeEnv, test);

	return Promise.resolve(testRunManager);
}