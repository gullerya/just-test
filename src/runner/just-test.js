// this is the main just-test SDK harness entrypoint from consumer perspective
// it is designed to run in 2 passes:
// - when the process context is session run, it should collect the setup, not running anything
// - when the process context is test run, it should execute the relevant test only
import { ExecutionContext, EXECUTION_MODES } from './environment-config.js';

export {
	suite
}

class SuiteContext {
	testRunner = null;

	constructor(testRunner) {
		this.test = testRunner;
	}
}

class TestContext {

}

function suite(suiteName, suiteOptions) {
	let suiteContext;
	const execContext = ExecutionContext.obtain();

	if (execContext.mode === EXECUTION_MODES.SESSION) {
		suiteContext = new SuiteContext(
			testRegisterer
		);
	} else {
		suiteContext = new SuiteContext(
			testRunner
		)
	}

	return suiteContext;
}

function testRegisterer(testName, testOptions, testCode) {
	if (!testName || typeof testName !== 'string') {
		//	notify error about badly configured test
	}
	if (typeof testCode !== 'function') {
		//	notify error about badly configured test
	}
}

function testRunner(testName, testOptions, testCode) {
	//	do run the test
}