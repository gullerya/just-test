import { EVENT } from '../common/constants.js';
import { getTestId, getValidName } from '../common/interop-utils.js';
import { runTest } from '../common/test-runner.js';

export {
	getSuite
}


//	TODO: this API should be abstracted away, so that the logic could be easily attached to 'describe', for example
function getSuite(suiteName) {
	const sName = getValidName(suiteName);

	return {
		test: async (testName, testCode) => {
			const tName = getValidName(testName);

			if (!testCode || typeof testCode !== 'function') {
				throw new Error(`test code MUST be a function, got '${testCode}'`);
			}

			const currentTestId = getTestId(sName, tName);
			const test = globalThis.interop.tests[currentTestId];
			if (test) {
				dispatchRunStartEvent(currentTestId, sName, tName);
				const run = await runTest(testCode, test.options);
				dispatchRunEndEvent(currentTestId, sName, tName, run);
				return run;
			}
		}
	}
}

//	private implementation
//
function dispatchRunStartEvent(testId, suiteName, testName) {
	const e = new CustomEvent(EVENT.RUN_START, {
		detail: {
			testId: testId,
			suite: suiteName,
			test: testName
		}
	});
	globalThis.dispatchEvent(e);
}

function dispatchRunEndEvent(testId, suiteName, testName, run) {
	const e = new CustomEvent(EVENT.RUN_END, {
		detail: {
			testId: testId,
			suite: suiteName,
			test: testName,
			run: run
		}
	});
	globalThis.dispatchEvent(e);
}
