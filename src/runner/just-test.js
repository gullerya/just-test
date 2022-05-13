//	this is the main just-test SDK harness entrypoint from consumer perspective
//	this module can found itself running in 3 modes:
//	- plain_run - simple test execution, no server, no interop, just debugging the tests
//	- session - tests registration phase, tests are not being run
//	- test - test run, only the tests required by environment will be running
import { ExecutionContext, EXECUTION_MODES } from './environment-config.js';
import { getTestId } from '../common/interop-utils.js';
import { STATUS } from '../common/constants.js';

export {
	getSuite
}

const DEFAULT_SUITE_OPTIONS = {
	only: false,
	skip: false,
	sequental: false
};

const DEFAULT_TEST_OPTIONS = {
	only: false,
	skip: false,
	ttl: 3000
}

class AssertTimeout extends Error { }

class TestContext {
	constructor() {
	}
}

class SuiteContext {
	#name = null;
	#mode = null;
	#only = false;
	#skip = false;
	#sequental = false;

	#testConfigs = [];
	#executionTail;

	constructor(name, mode, options = DEFAULT_SUITE_OPTIONS) {
		this.#name = name;
		this.#mode = mode;

		this.#only = Boolean(options?.only);
		this.#skip = Boolean(options?.skip);
		this.#sequental = Boolean(options?.sequental);
	}

	get name() { return this.#name; }

	get only() { return this.#only; }

	get skip() { return this.#skip; }

	get test() {
		return this.#mode === EXECUTION_MODES.SESSION
			? this.#registerTest
			: this.#runTest;
	}

	async run() {
		console.log(`suite '${this.#name}' started...`);
		const testPromises = [];
		this.#executionTail = Promise.resolve();
		for (const testConfig of this.#testConfigs) {
			if (!testConfig.skip) {
				const runResultPromise = this.#runTest(testConfig.tName, testConfig.tOptions, testConfig.tCode);
				if (this.#sequental) {
					this.#executionTail = this.#executionTail.finally(() => runResultPromise);
				} else {
					testPromises.push(runResultPromise);
				}
			}
		}
		testPromises.push(this.#executionTail);
		await Promise.all(testPromises);
		console.log(`... suite '${this.#name}' done`);
	}

	#registerTest(name, options, code) {
		const testConfig = this.#verifyNormalize(name, options, code);

		this.#testConfigs.push(testConfig);

		if (this.#testConfigs.length === 1) {
			this.run();
		}
	}

	async #runTest(name, options, code) {
		const { tName, tOptions, tCode } = this.#verifyNormalize(name, options, code);

		if (this.#sequental && this.#executionTail) {
			await this.#executionTail;
		}

		const testId = getTestId(this.#name, tName);
		console.log(`'${testId}' started...`);

		const run = {};
		let runResult;
		let start;
		let timeout;
		try {
			run.timestamp = Date.now();
			start = globalThis.performance.now();
			const testContext = new TestContext();
			const runPromise = Promise.race([
				new Promise(resolve => {
					timeout = setTimeout(
						resolve,
						tOptions.ttl,
						new AssertTimeout(`run of '${testId}' exceeded ${tOptions.ttl}ms`));
				}),
				Promise.resolve(tCode(testContext))
			]);
			if (this.#sequental) {
				this.#executionTail = runPromise;
			}
			runResult = await runPromise;
		} catch (e) {
			runResult = e;
		} finally {
			clearTimeout(timeout);
			run.time = Math.round((globalThis.performance.now() - start) * 10000) / 10000;
			finalizeRun(run, runResult);
			console.log(`'${testId}' ${run.status.toUpperCase()} in ${run.time}ms`);
		}

		return run;
	}

	#verifyNormalize(name, options, code) {
		if (!name || typeof name !== 'string') {
			throw new Error(`invalid test name: '${name}'`);
		}
		if (typeof options === 'function' || !options) {
			code = options;
			options = DEFAULT_TEST_OPTIONS;
		}
		if (typeof code !== 'function') {
			throw new Error(`invalid test code: '${code}'`);
		}

		return { tName: name, tOptions: options, tCode: code };
	}
}

function getSuite(suiteName, suiteOptions) {
	if (!suiteName || typeof suiteName !== 'string') {
		throw new Error(`invalid suite name '${suiteName}'`);
	}

	const execContext = ExecutionContext.obtain();

	return new SuiteContext(
		suiteName,
		execContext.mode,
		suiteOptions
	);
}

function finalizeRun(run, runResult) {
	if (runResult && typeof runResult.name === 'string' && typeof runResult.message === 'string' && runResult.stack) {
		const runError = processError(runResult);
		if ((runError.type && runError.type.toLowerCase().includes('assert')) ||
			(runError.name && runError.name.toLowerCase().includes('assert'))) {
			run.status = STATUS.FAIL;
		} else {
			run.status = STATUS.ERROR;
		}
		run.error = runError;
	} else {
		run.status = STATUS.PASS;
	}
}

function processError(error) {
	const stacktrace = error.stack.split(/\r\n|\r|\n/)
		.map(l => l.trim())
		.filter(Boolean);

	return {
		name: error.name,
		type: error.constructor.name,
		message: error.message,
		stacktrace
	};
}
