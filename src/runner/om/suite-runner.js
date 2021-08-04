import { getTestId, getValidName } from '../../common/interop-utils.js';

export {
	getSuite
}

/**
 * provides an API to run a test in a context of suite
 * - `this` is implied to be a TestRunBox context object
 * 
 * @param {string} suiteName suite name - serves as a suite identifier
 * @returns test run data
 */
function getSuite(suiteName) {
	const sName = getValidName(suiteName);

	return {
		test: async (testName, testCode) => {
			const tName = getValidName(testName);
			const testId = getTestId(sName, tName);

			if (this.test.id !== testId) {
				return;
			}

			this.resolveStarted();
			const run = await this.runTest(testCode, this.test.config);
			this.resolveEnded(run);
			return run;
		}
	}
}