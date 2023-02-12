//	this is the main just-test SDK harness entrypoint from consumer perspective
//	this module can found itself running in 3 modes:
//	- plain_run - simple test execution, no server, no interop, just debugging the tests
//	- plan - tests registration phase, tests are not being run
//	- test - test run, only the tests required by environment will be running
import { obtainExecutionContext, EXECUTION_MODES } from './environment-config.js';
import { EVENT, STATUS } from '../common/constants.js';

export { suite, test }

const DEFAULT_SUITE_OPTIONS = {
	only: false,
	skip: false,
	sequental: false
};

const DEFAULT_TEST_OPTIONS = {
	only: false,
	skip: false,
	timeout: 3000
};

const suite = Object.freeze({
	configure: (name, opts) => {
		if (typeof name === 'object') {
			if (opts) {
				throw new Error(`when no name provided only single 'opts' object parameter expected, got second param: ${opts}`);
			}
			opts = name;
			name = undefined;
		}
		opts = Object.assign({}, DEFAULT_SUITE_OPTIONS, opts);
		//	setup the suite's name and options
	}
});

// const DEFAULT_CONFIGS_SUBMISSION_DELAY = 92;

// class Test {
// 	constructor(id = null, name = 'Undefined', suiteName = 'Undefined', config = {}, source = null) {
// 		this.id = id;
// 		this.name = name;
// 		this.suiteName = suiteName;
// 		this.config = config;
// 		this.source = source;

// 		this.lastRun = null;
// 		this.runs = [];
// 		Object.seal(this);
// 	}
// }

// class SuiteContext {
// 	#name = null;
// 	#mode = null;
// 	#testId = null;

// 	#port = null;
// 	#only = false;
// 	#skip = false;
// 	#sequental = false;

// 	#testConfigs = [];
// 	#testConfigsSubmitter = null;
// 	#executionTail;

// 	constructor(name, execContext, options = DEFAULT_SUITE_OPTIONS) {
// 		this.#name = name;
// 		this.#mode = execContext.mode;
// 		this.#testId = execContext.testId;

// 		this.#port = execContext.childPort;

// 		this.#only = Boolean(options?.only);
// 		this.#skip = Boolean(options?.skip);
// 		this.#sequental = Boolean(options?.sequental);
// 	}

// 	get name() { return this.#name; }

// 	get only() { return this.#only; }

// 	get skip() { return this.#skip; }

// 	get test() {
// 		return this.#mode === EXECUTION_MODES.PLAN
// 			? this.#registerTest
// 			: this.#runTest;
// 	}

// 	async run() {
// 		console.info(`suite '${this.#name}' started...`);
// 		const testPromises = [];
// 		this.#executionTail = Promise.resolve();
// 		for (const testConfig of this.#testConfigs) {
// 			if (!testConfig.skip) {
// 				const runResultPromise = this.#runTest(testConfig.tName, testConfig.tOptions, testConfig.tCode);
// 				if (this.#sequental) {
// 					this.#executionTail = this.#executionTail.finally(() => runResultPromise);
// 				} else {
// 					testPromises.push(runResultPromise);
// 				}
// 			}
// 		}
// 		testPromises.push(this.#executionTail);
// 		await Promise.all(testPromises);
// 		console.info(`... suite '${this.#name}' done`);
// 	}

// 	#registerTest(name, options, code) {
// 		if (!this.#testConfigsSubmitter) {
// 			this.#testConfigsSubmitter = globalThis.setTimeout(() => {
// 				this.#port.postMessage(this.#testConfigs);
// 			}, DEFAULT_CONFIGS_SUBMISSION_DELAY);
// 		}

// 		const testConfig = this.#verifyNormalize(name, options, code);
// 		this.#testConfigs.push(testConfig);
// 	}

// 	async #runTest(name, options, code) {
// 		const testConfig = this.#verifyNormalize(name, options, code);
// 		if (this.#mode === EXECUTION_MODES.TEST && this.#testId !== testConfig.id) {
// 			return;
// 		}
// 		if (typeof options === 'function') {
// 			code = options;
// 		}

// 		if (this.#sequental && this.#executionTail) {
// 			await this.#executionTail;
// 		}

// 		console.info(`'${testConfig.id}' started...`);
// 		if (this.#mode === EXECUTION_MODES.TEST) {
// 			const runStartMessage = {
// 				type: EVENT.RUN_STARTED,
// 				suiteName: this.#name,
// 				testName: name
// 			};
// 			this.#port.postMessage(runStartMessage);
// 		}

// 		const run = {};
// 		let runResult;
// 		let start;
// 		let timeout;
// 		try {
// 			run.timestamp = Date.now();
// 			start = globalThis.performance.now();
// 			const runPromise = Promise.race([
// 				new Promise(resolve => {
// 					timeout = setTimeout(
// 						resolve,
// 						testConfig.config.ttl,
// 						new AssertTimeout(`run of '${testConfig.id}' exceeded ${testConfig.config.ttl}ms`));
// 				}),
// 				Promise.resolve(code())
// 			]);
// 			if (this.#sequental) {
// 				this.#executionTail = runPromise;
// 			}
// 			runResult = await runPromise;
// 		} catch (e) {
// 			console.error(e);
// 			runResult = e;
// 		} finally {
// 			clearTimeout(timeout);
// 			run.time = Math.round((globalThis.performance.now() - start) * 10000) / 10000;
// 			finalizeRun(run, runResult);
// 			if (this.#mode === EXECUTION_MODES.TEST) {
// 				const runEndedMessage = {
// 					type: EVENT.RUN_ENDED,
// 					suiteName: this.#name,
// 					testName: name,
// 					run
// 				};
// 				this.#port.postMessage(runEndedMessage);
// 			}
// 			console.info(`'${testConfig.id}' ${run.status.toUpperCase()} in ${run.time}ms`);
// 		}

// 		return run;
// 	}
// }

function test(name, opts, code) {
	const ec = obtainExecutionContext();
	switch (ec.mode) {
		case EXECUTION_MODES.TEST: {
			return executeRun(name, opts, code, ec.childPort);
		}
		case EXECUTION_MODES.PLAN: {
			const { name: nameF, opts: optsF } = validate(name, opts, code);
			ec.childPort.postMessage({
				type: EVENT.TEST_PLAN,
				testName: nameF,
				testOpts: optsF
			});
			break;
		}
		case EXECUTION_MODES.PLAIN_RUN: {
			const { name: nameF, opts: optsF, code: codeF } = validate(name, opts, code);
			return executeRun(nameF, optsF, codeF, ec.childPort);
		}
		default:
			throw new Error(`unexpected execution mode: ${ec.mode}`);
	}
}

function validate(name, opts, code) {
	if (!name || typeof name !== 'string') {
		throw new Error(`test name MUST be a non-empty string, got: ${name}`);
	}
	if (typeof opts === 'function') {
		if (code) {
			throw new Error(`when second parameter is a test's code no further parameter expected, got (in 3rd place): ${code}`);
		}
		code = opts;
		opts = DEFAULT_TEST_OPTIONS;
	} else {
		if (!opts || typeof opts !== 'object') {
			throw new Error(`options, when provided, expected to be an object, got: ${JSON.stringify(opts)}`);
		}
		if (!code || typeof code !== 'function') {
			throw new Error(`test code expected, got: ${JSON.stringify(code)}`);
		}
		opts = Object.assign({}, DEFAULT_TEST_OPTIONS, opts);
	}
	return { name, opts, code };
}

async function executeRun(name, opts, code, messageBus) {
	console.info(`'${name}' started...`);
	messageBus.postMessage({
		type: EVENT.RUN_STARTED,
		testName: name
	});

	const run = {};
	const timeoutError = new Error(`run of '${name}' exceeded ${opts.timeout}ms`);
	let runError = null;
	let start;
	let timeout;
	try {
		run.timestamp = Date.now();
		start = globalThis.performance.now();
		const runPromise = Promise.race([
			new Promise(resolve => { timeout = setTimeout(resolve, opts.timeout, timeoutError); }),
			Promise.resolve(code())
		]);
		runError = await runPromise;
	} catch (e) {
		console.error(e);
		runError = e;
	} finally {
		clearTimeout(timeout);
		run.time = Math.round((globalThis.performance.now() - start) * 10000) / 10000;
		finalizeRun(run, runError);
		messageBus.postMessage({
			type: EVENT.RUN_ENDED,
			testName: name,
			run
		});
		console.info(`'${name}' ${run.status.toUpperCase()} in ${run.time}ms`);
	}

	return run;
}

function finalizeRun(run, runError) {
	if (runError && typeof runError.name === 'string' && typeof runError.message === 'string' && runError.stack) {
		runError = processError(runError);
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
