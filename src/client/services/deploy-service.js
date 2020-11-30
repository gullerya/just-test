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
 * @returns {object: Promise} - promise to be resolved upon test run finalization
 */
function deployTest(test, currentEnvironment) {
	let runEndPromise;
	if (currentEnvironment.interactive) {
		runEndPromise = executeInFrame(test);
	} else if (currentEnvironment.browser.someKeyToThrowHere) {
		runEndPromise = executeInPage(test);
	} else {
		runEndPromise = executeInNodeJS(test);
	}
	return runEndPromise;
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
			injectTestBrowser(i.contentDocument, test.source);
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
			injectTestBrowser(w.document, test.source);
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

function injectTestBrowser(envDocument, testSource) {
	const s = envDocument.createElement('script');
	s.type = 'module';
	s.src = `/tests/${testSource}`;
	envDocument.head.appendChild(s);
}