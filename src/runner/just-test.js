//	this is the main just-test SDK harness entrypoint from consumer perspective
//	this module can found itself running in 3 modes:
//	- plain_run - simple test execution, no server, no interop, just debugging the tests
//	- plan - tests planning phase, tests are not being run
//	- test - test run, only the tests required by environment will be running
import { getExecutionContext, EXECUTION_MODES } from './environment-config.js';
import { STATUS } from '../common/constants.js';
import { TestError } from '../testing/model/test-error.ts';
import { TestRun } from '../testing/model/test-run.ts';

export { suite, test, TestDto };

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

class TestDto {
	constructor(name, config) {
		this.name = name;
		this.config = config;
	}
}

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

async function test(name, code, opts = DEFAULT_TEST_OPTIONS) {
	const { name: nameF, code: codeF, opts: optsF, error } = validate(name, code, opts);
	const run = new TestRun();
	run.timestamp = Date.now();

	if (error) {
		return finalizeRun(run, new Error(error));
	}

	const ecKey = opts.ecKey || undefined;
	delete opts.ecKey;
	const ec = getExecutionContext(ecKey);
	switch (ec.mode) {
		case EXECUTION_MODES.PLAN: {
			ec.addTestConfig({ name: nameF, config: optsF });
			break;
		}
		case EXECUTION_MODES.TEST: {
			if (ec.testId !== name) {
				return null;
			}
			await ec.startHandler(name);
			await executeRun(nameF, codeF, optsF, run);
			await ec.endHandler(name, run);
			break;
		}
		case EXECUTION_MODES.PLAIN_RUN:
		default:
			return await executeRun(nameF, codeF, optsF, run);
	}
	return run;
}

function validate(name, code, opts) {
	if (!name || typeof name !== 'string') {
		return { error: `test name MUST be a non-empty string, got: '${name}'` };
	}
	if (!code || typeof code !== 'function') {
		return { error: `test code expected, got: ${JSON.stringify(code)}` };
	}

	if (!opts || typeof opts !== 'object') {
		return { error: `options, when provided, expected to be a non-null object, got: ${JSON.stringify(opts)}` };
	}
	opts = Object.assign({}, DEFAULT_TEST_OPTIONS, opts);

	if (opts.only && opts.skip) {
		return { error: `can't opt in 'only' and 'skip' at the same time, found in test: ${name}` };
	}
	return { name, code, opts };
}

async function executeRun(name, code, opts, run) {
	if (opts.skip) {
		run.status = STATUS.SKIP;
		return run;
	}

	const timeoutError = new Error(`timeout assertion: run of '${name}' exceeded ${opts.timeout}ms`);
	let runError;
	let start;
	let timeout;
	try {
		start = globalThis.performance.now();
		const runPromise = Promise.race([
			new Promise(resolve => { timeout = setTimeout(resolve, opts.timeout, timeoutError); }),
			code()
		]);
		runError = await runPromise;
	} catch (e) {
		console.error(e);
		runError = e;
	} finally {
		clearTimeout(timeout);
		run.time = Math.round((globalThis.performance.now() - start) * 10000) / 10000;
		run.time = Math.max(run.time, 0.1); // minimum time slice is 0.1ms

	}
	return finalizeRun(run, runError);
}

function finalizeRun(run, runError) {
	if (runError && typeof runError.name === 'string' && typeof runError.message === 'string') {
		runError = TestError.fromError(runError);
		if ((runError.type && runError.type.toLowerCase().includes('assert')) ||
			(runError.name && runError.name.toLowerCase().includes('assert')) ||
			(runError.message && runError.message.toLowerCase().includes('assert'))
		) {
			run.status = STATUS.FAIL;
		} else {
			run.status = STATUS.ERROR;
		}
		run.error = runError;
	} else {
		run.status = STATUS.PASS;
	}
	return run;
}

