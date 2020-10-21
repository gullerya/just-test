import { EVENTS } from '../../commons/interop-utils.js';

/**
 * deploys a single test within a given environment
 * - in the browser non-interactive context injects the test into the newly created page
 * - in the browder interactive context injects the test into the newly created frame
 * - in NodeJS context injects the test into a NodeJS fork
 * 
 * @param {object} currentEnvironment - current envoronment
 * @returns {object: Promise} - promise to be resolved upon test run finalization
 */
export function deployTest(test, currentEnvironment) {
	let runEndPromise;
	if (currentEnvironment.browser) {
		if (currentEnvironment.interactive) {
			runEndPromise = executeInFrame(test);
		} else {
			runEndPromise = executeInPage(test);
		}
	} else {
		runEndPromise = executeInNodeJS(test);
	}
	return runEndPromise;
}

function executeInFrame(test) {
	const rp = getResolvablePromise();
	const d = globalThis.document;
	const i = d.createElement('iframe');
	i.classList.add('just-test-execution-frame');
	i.src = 'services/deploy/browser/browser-test-runner.html';
	i.onload = event => {
		injectInteropsBrowser(event.target.contentWindow, test, rp);
		injectTestBrowser(event.target.contentDocument, test.source);
	};
	d.body.appendChild(i);
	return rp;
}

function executeInPage(test) {
	const rp = getResolvablePromise();
	const w = globalThis.open('services/deploy/browser/browser-test-runner.html');
	w.onload = event => {
		injectInteropsBrowser(w, test, rp);
		injectTestBrowser(event.target, test.source);
	};
	return rp;
}

function executeInNodeJS(test) {
	throw new Error(`unsupported yet environment to run ${test.id} from ${test.source}`);
}

function injectInteropsBrowser(targetWindow, test, resolvablePromise) {
	const interopAPIs = targetWindow.interop || (targetWindow.interop = {
		tests: {}
	});
	interopAPIs.tests[test.id] = { options: test.options };

	//	listener on test run
	targetWindow.addEventListener(EVENTS.RUN_STARTED, () => {
		// TODO: add here state service update with DEPLOYING status
		// console.log(`started ${JSON.stringify(e.detail)}`);
	}, { once: true });
	targetWindow.addEventListener(EVENTS.RUN_ENDED, e => {
		resolvablePromise.resolve(e.detail);
	}, { once: true });
}

function injectTestBrowser(document, testSource) {
	const s = document.createElement('script');
	s.type = 'module';
	s.src = `/tests/${testSource}`;
	document.head.appendChild(s);
}

function getResolvablePromise() {
	let tmpRes, tmpRej;
	const result = new Promise((resolve, reject) => {
		tmpRes = resolve;
		tmpRej = reject;
	});
	result.resolve = tmpRes;
	result.reject = tmpRej;
	return result;
}