import { EVENTS, STATUS } from '../common/constants.js';
import { getTestId, getValidName } from '../common/interop-utils.js';
import { TestAsset } from '../common/test-asset.js';

export {
	getSuite,
	runTestCode
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
	const testAsset = new TestAsset();
	const start = performance.now();
	await Promise
		.race([
			new Promise(resolve => setTimeout(resolve, options.ttl, new TimeoutError('timeout'))),
			new Promise(resolve => Promise.resolve(testCode(testAsset)).then(resolve).catch(resolve))
		])
		.then(r => { runResult = r; })
		.catch(e => { runResult = e; })
		.finally(() => {
			run.time = performance.now() - start;
			finalizeRun(options, run, runResult, testAsset.asserts);
		});

	return run;
}

function finalizeRun(options, run, result, asserts) {
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
			run.error = processError(new AssertError(`expected an error "${options.expectError}" but not seen`));
		} else {
			run.status = STATUS.PASS;
		}
	}
	run.asserts = asserts;
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
