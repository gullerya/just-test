import { DEFAULT, STATUS } from '../../common/constants.js';
import { TestAsset } from './test-asset.js';
import { TestRun } from '../../common/models/tests/test-run.js';
import { TestError } from '../../common/models/tests/test-error.js';
import { P } from '../../common/performance-utils.js';

export {
	runTest
}

class AssertError extends Error { }

class TimeoutError extends AssertError { }

//	TODO: this one is internal and should receive the TestRun object as part of it's parameters
async function runTest(code, meta = { ttl: DEFAULT.TEST_RUN_TTL }) {
	let runResult;
	const run = new TestRun();
	run.timestamp = Date.now();

	const testAsset = new TestAsset();

	const start = P.now();
	try {
		runResult = await Promise.race([
			new Promise(resolve => setTimeout(resolve, meta.ttl, new TimeoutError(`run exceeded ${meta.ttl}ms`))),
			Promise.resolve(code(testAsset))
		]);
	} catch (e) {
		runResult = e;
	} finally {
		run.time = Math.round((P.now() - start) * 10000) / 10000;
		finalizeRun(meta, run, runResult, testAsset.assertions);
	}

	return run;
}

function finalizeRun(meta, run, result, assertions) {
	if (meta.expectError) {
		assertions++;
	}

	let runError = null;
	if (result && typeof result.name === 'string' && typeof result.message === 'string' && result.stack) {
		runError = processError(result);
		if (meta.expectError && (runError.type === meta.expectError || runError.message.includes(meta.expectError))) {
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
		if (meta.expectError) {
			run.status = STATUS.FAIL;
			runError = processError(new AssertError(`expected for error "${meta.expectError}" but not happened`));
		} else {
			run.status = STATUS.PASS;
		}
	}
	run.assertions = assertions;
	run.error = runError;
}

function processError(error) {
	const replaceable = globalThis.location.origin;
	const stacktrace = error.stack.split(/\r\n|\r|\n/)
		.map(l => l.trim())
		.map(l => l.replace(replaceable, ''));
	stacktrace.shift();

	return new TestError(
		error.name,
		error.constructor.name,
		error.message,
		stacktrace
	);
}
