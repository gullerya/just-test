//	this is the main just-test SDK harness entrypoint from consumer perspective
//	this module can found itself running in 3 modes:
//	- plain_run - simple test execution, no server, no interop, just debugging the tests
//	- plan - tests planning phase, tests are not being run
//	- test - test run, only the tests required by environment will be running
import { getExecutionContext, EXECUTION_MODES } from './environment-config.js';
import { STATUS } from '../common/constants.js';

export { suite, test, TestDto }

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

async function test(name, opts, code) {
	const { name: nameF, opts: optsF, code: codeF } = validate(name, opts, code);

	const ecKey = opts.ecKey || undefined;
	delete opts.ecKey;
	const ec = getExecutionContext(ecKey);
	if (ec) {
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
				const run = await executeRun(nameF, optsF, codeF);
				await ec.endHandler(name, run);
				return run;
			}
			default:
				throw new Error(`unexpected execution mode: ${ec.mode}`);
		}
	} else {
		return await executeRun(nameF, optsF, codeF);
	}
}

function validate(name, opts, code) {
	if (!name || typeof name !== 'string') {
		throw new Error(`test name MUST be a non-empty string, got: '${name}'`);
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
	if (opts.only && opts.skip) {
		throw new Error(`can't opt in 'only' and 'skip' at the same time, found in test: ${name}`);
	}
	return { name, opts, code };
}

async function executeRun(name, opts, code) {
	if (opts.skip) {
		return {
			status: STATUS.SKIP
		};
	}

	const run = {};
	const timeoutError = new Error(`timeout assertion: run of '${name}' exceeded ${opts.timeout}ms`);
	let runError;
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
	}

	return run;
}

function finalizeRun(run, runError) {
	if (runError && typeof runError.name === 'string' && typeof runError.message === 'string' && runError.stack) {
		runError = processError(runError);
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
}

function processError(error) {
	const cause = error.cause ? processError(error.cause) : undefined;
	const stacktrace = error.stack.split(/\r\n|\r|\n/)
		.map(l => l.trim())
		.filter(Boolean);

	return {
		name: error.name,
		type: error.constructor.name,
		message: error.message,
		cause,
		stacktrace
	};
}
