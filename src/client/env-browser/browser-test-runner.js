import { EVENTS, STATUS } from '../common/constants.js';
import { getTestId, getValidName } from '../common/interop-utils.js';
import { waitMillis, waitNextTask } from '../common/await-utils.js';
import { getRandom } from '../common/random-utils.js';

export {
	getSuite,
	runTestCode
}

class TestAssets {
	constructor() {
		this.asserts = 0;
	}
}

class AssertError extends Error { }

class TimeoutError extends AssertError { }

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
				const run = await runTestCode(testCode, test.options);
				dispatchRunEndEvent(currentTestId, sName, tName, run);
			}
		}
	}
}

async function runTestCode(testCode, options) {
	const run = {};

	let runResult;
	const testAssets = new TestAssets();
	const start = performance.now();
	await Promise
		.race([
			new Promise(resolve => setTimeout(resolve, options.ttl, new TimeoutError('timeout'))),
			new Promise(resolve => Promise.resolve(testCode(testAssets)).then(resolve).catch(resolve))
		])
		.then(r => { runResult = r; })
		.catch(e => { runResult = e; })
		.finally(() => {
			run.time = performance.now() - start;
			finalizeRun(options, run, runResult, testAssets);
		});

	return run;
}

function finalizeRun(options, run, result, testAssets) {
	if (result instanceof Error) {
		const pe = processError(result);
		if (options.expectError && (pe.type === options.expectError || pe.message.includes(options.expectError))) {
			run.status = STATUS.PASS;
		} else {
			run.status = STATUS.FAIL;
			run.error = pe;
		}
	} else {
		if (options.expectError) {
			run.status = STATUS.FAIL;
			run.error = processError(new AssertError(`expected an error '${options.expectError}' but not seen`));
		} else {
			run.status = STATUS.PASS;
		}
	}
	run.asserts = testAssets.asserts;
}

function processError(error) {
	if (!(error instanceof Error)) {
		throw new Error(`error expected; found '${error}'`);
	}

	const replacable = globalThis.location.origin;
	const stackLines = error.stack.split(/\r\n|\r|\n/)
		.map(l => l.trim())
		.map(l => l.replace(replacable, ''));
	stackLines.shift();

	//	TODO: probably extract file location from each line...
	return {
		name: error.name,
		type: error.constructor.name,
		message: error.message,
		stackLines: stackLines
	};
}

function dispatchRunStartEvent(testId, suiteName, testName) {
	const e = new CustomEvent(EVENTS.RUN_START, {
		detail: {
			testId: testId,
			suite: suiteName,
			test: testName
		}
	});
	globalThis.dispatchEvent(e);
}

function dispatchRunEndEvent(testId, suiteName, testName, run) {
	const e = new CustomEvent(EVENTS.RUN_END, {
		detail: {
			testId: testId,
			suite: suiteName,
			test: testName,
			run: run
		}
	});
	globalThis.dispatchEvent(e);
}

TestAssets.prototype.waitNextTask = waitNextTask;

TestAssets.prototype.waitMillis = waitMillis;

TestAssets.prototype.getRandom = getRandom;

TestAssets.prototype.assertEqual = function (expected, actual) {
	this.asserts++;
	if (expected !== actual) {
		throw new AssertError(`expected: ${expected}, found: ${actual}`);
	}
}

TestAssets.prototype.assertNotEqual = function (unexpected, actual) {
	this.asserts++;
	if (unexpected === actual) {
		throw new AssertError(`unexpected: ${unexpected}, found: ${actual}`);
	}
}

TestAssets.prototype.assertTrue = function (expression) {
	this.asserts++;
	if (expression !== true) {
		throw new AssertError(`expected: true, found: ${expression}`);
	}
}

TestAssets.prototype.assertFalse = function (expression) {
	this.asserts++;
	if (expression !== false) {
		throw new AssertError(`expected: false, found: ${expression}`);
	}
}

TestAssets.prototype.fail = message => {
	throw new AssertError(message);
}