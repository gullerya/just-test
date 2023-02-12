//	this is the main just-test SDK harness entrypoint from consumer perspective
//	this module can found itself running in 3 modes:
//	- plain_run - simple test execution, no server, no interop, just debugging the tests
//	- plan - tests registration phase, tests are not being run
//	- test - test run, only the tests required by environment will be running
import { getExecutionContext, setExecutionContext, EXECUTION_MODES } from './environment-config.js';
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

function obtainExecutionContext() {
	let result = getExecutionContext();
	if (!result) {
		console.log('no execution context found, creating PLAIN run one...');
		setExecutionContext(undefined, EXECUTION_MODES.PLAIN_RUN);
		result = getExecutionContext();
	}
	return result;
}