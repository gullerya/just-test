// this is the main just-test SDK harness entrypoint from consumer perspective
// it is designed to run in 2 passes:
// - when the process context is session run, it should collect the setup, not running anything
// - when the process context is test run, it should execute the relevant test only
import { ExecutionContext, EXECUTION_MODES } from './environment-config.js';
import { getTestId, getValidName } from '../common/interop-utils.js';

export {
	getSuite
}

class TestContext {
	constructor() {

	}
}

class SuiteContext {
	#name = null;
	#mode = null;
	#options = null;

	constructor(name, mode, options) {
		this.#name = name;
		this.#mode = mode;
		this.#options = options;
	}

	get name() {
		return this.#name;
	}

	get options() {
		return this.#options;
	}

	get test() {
		return this.#mode === EXECUTION_MODES.SESSION
			? this.#registerTest
			: this.#runTest;
	}

	#registerTest(testName, testOptions, testCode) {
		if (!testName || typeof testName !== 'string') {
			//	notify error about badly configured test
		}
		if (typeof testOptions === 'function') {
			testCode = testOptions;
			testOptions = null;
		}
		if (!testOptions) {
			//	make default options
		}
		if (typeof testCode !== 'function') {
			//	notify error about badly configured test
		}
		console.log(this);
	}

	async #runTest(testName, testOptions, testCode) {
		const tName = getValidName(testName);
		const testId = getTestId(sName, tName);

		if (testId !== test.id) {
			return;
		}

		//	childToParentIPC.sendRunStarted(test.id);
		const run = await runTest(testCode, test.config);
		//	childToParentIPC.sendRunResult(test.id, run);
	}
}

function getSuite(suiteName, suiteOptions) {
	const sName = getValidName(suiteName);
	const execContext = ExecutionContext.obtain();

	return new SuiteContext(
		sName,
		execContext.mode,
		suiteOptions
	);
}

async function runTest(code, config = { ttl: DEFAULT.TEST_RUN_TTL }) {
	let runResult;
	const run = new TestRun();
	run.timestamp = Date.now();

	const testAsset = new TestAsset();

	const
		P = await perfReady,
		start = P.now();
	try {
		runResult = await Promise.race([
			new Promise(resolve => setTimeout(resolve, config.ttl, new TimeoutError(`run exceeded ${config.ttl}ms`))),
			Promise.resolve(code(testAsset))
		]);
	} catch (e) {
		runResult = e;
	} finally {
		run.time = Math.round((P.now() - start) * 10000) / 10000;
		finalizeRun(config, run, runResult, testAsset.assertions);
	}

	return run;
}

function finalizeRun(config, run, result, assertions) {
	if (config.expectError) {
		assertions++;
	}

	let runError = null;
	if (result && typeof result.name === 'string' && typeof result.message === 'string' && result.stack) {
		runError = processError(result);
		if (config.expectError && (runError.type === config.expectError || runError.message.includes(config.expectError))) {
			run.status = STATUS.PASS;
		} else {
			if ((runError.type && runError.type.toLowerCase().includes('assert')) ||
				(runError.name && runError.name.toLowerCase().includes('assert'))) {
				run.status = STATUS.FAIL;
			} else {
				run.status = STATUS.ERROR;
			}
		}
	} else if (result === false) {
		run.status = STATUS.FAIL;
		assertions++;
	} else {
		if (config.expectError) {
			run.status = STATUS.FAIL;
			runError = processError(new AssertError(`expected for error "${config.expectError}" but not happened`));
		} else {
			run.status = STATUS.PASS;
		}
	}
	run.assertions = assertions;
	run.error = runError;
}

function processError(error) {
	const replaceable = globalThis.location?.origin || '';
	const stacktrace = error.stack.split(/\r\n|\r|\n/)
		.map(l => l.trim())
		.map(l => l.replace(replaceable, ''))
		.map(l => l.replace(/^\s*at\s*/, ''))
		.filter(Boolean);
	stacktrace.shift();

	return new TestError(
		error.name,
		error.constructor.name,
		error.message,
		stacktrace
	);
}
