//	this is the main just-test SDK harness entrypoint from consumer perspective
//	this module can found itself running in 3 modes:
//	- plain_run - simple test execution, no server, no interop, just debugging the tests
//	- session - tests registration phase, tests are not being run
//	- test - test run, only the tests required by environment will be running
import { obtainExecutionContext, EXECUTION_MODES } from './environment-config.js';
import { getTestId } from '../common/interop-utils.js';
import { EVENT, STATUS } from '../common/constants.js';
import { Test } from '../testing/model/test.js';

export {
	getSuite,
	MessageBus
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
};

const DEFAULT_CONFIGS_SUBMISSION_DELAY = 92;

class AssertTimeout extends Error { }

const MessageBus = new MessageChannel();

class SuiteContext {
	#name = null;
	#mode = null;
	#testId = null;

	#port = null;
	#only = false;
	#skip = false;
	#sequental = false;

	#testConfigs = [];
	#testConfigsSubmitter = null;
	#executionTail;

	constructor(name, execContext, options = DEFAULT_SUITE_OPTIONS) {
		this.#name = name;
		this.#mode = execContext.mode;
		this.#testId = execContext.testId;

		this.#port = execContext.childPort;

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
		console.info(`suite '${this.#name}' started...`);
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
		console.info(`... suite '${this.#name}' done`);
	}

	#registerTest(name, options, code) {
		if (!this.#testConfigsSubmitter) {
			this.#testConfigsSubmitter = globalThis.setTimeout(() => {
				console.info(`reporting ${this.#testConfigs.length} test config/s...`);
				this.#port.postMessage(this.#testConfigs);
				console.info(`... reported`);
			}, DEFAULT_CONFIGS_SUBMISSION_DELAY);
		}

		const testConfig = this.#verifyNormalize(name, options, code);
		this.#testConfigs.push(testConfig);
	}

	async #runTest(name, options, code) {
		const testConfig = this.#verifyNormalize(name, options, code);
		if (this.#mode === EXECUTION_MODES.TEST && this.#testId !== testConfig.id) {
			return;
		}
		if (typeof options === 'function') {
			code = options;
		}

		if (this.#sequental && this.#executionTail) {
			await this.#executionTail;
		}

		console.info(`'${testConfig.id}' started...`);
		if (this.#mode === EXECUTION_MODES.TEST) {
			const runStartMessage = {
				type: EVENT.RUN_STARTED,
				suiteName: this.#name,
				testName: name
			};
			this.#port.postMessage(runStartMessage);
		}

		const run = {};
		let runResult;
		let start;
		let timeout;
		try {
			run.timestamp = Date.now();
			start = globalThis.performance.now();
			const runPromise = Promise.race([
				new Promise(resolve => {
					timeout = setTimeout(
						resolve,
						testConfig.config.ttl,
						new AssertTimeout(`run of '${testConfig.id}' exceeded ${testConfig.config.ttl}ms`));
				}),
				Promise.resolve(code())
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
			if (this.#mode === EXECUTION_MODES.TEST) {
				const runEndedMessage = {
					type: EVENT.RUN_ENDED,
					suiteName: this.#name,
					testName: name,
					run
				};
				this.#port.postMessage(runEndedMessage);
			}
			console.info(`'${testConfig.id}' ${run.status.toUpperCase()} in ${run.time}ms`);
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

		const result = new Test(
			getTestId(this.#name, name),
			name,
			this.#name,
			options
		);
		return result;
	}
}

function getSuite(suiteName, suiteOptions) {
	if (!suiteName || typeof suiteName !== 'string') {
		throw new Error(`invalid suite name '${suiteName}'`);
	}

	const execContext = obtainExecutionContext();

	return new SuiteContext(
		suiteName,
		execContext,
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
