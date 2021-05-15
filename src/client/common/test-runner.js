import { DEFAULT, STATUS } from './constants.js';
import { TestAsset } from './test-asset.js';
import { TestRun } from './test-run.js';
import { P } from './performance-utils.js';

export {
	runTest
}

class AssertError extends Error { }

class TimeoutError extends AssertError { }

async function runTest(code, meta = { ttl: DEFAULT.TEST_RUN_TTL }) {
	let runResult;
	const run = new TestRun();
	const testAsset = new TestAsset();

	run.timestamp = Date.now();
	const start = P.now();
	try {
		runResult = await Promise.race([
			new Promise(resolve => setTimeout(resolve, meta.ttl, new TimeoutError(`run exceeded ${meta.ttl}ms`))),
			Promise.resolve(code(testAsset))
		]);
	} catch (e) {
		runResult = e;
	} finally {
		run.time = P.now() - start;
		finalizeRun(meta, run, runResult, testAsset.assertions);
	}

	return run;
}

function finalizeRun(meta, run, result, assertions) {
	if (result && typeof result.name === 'string' && typeof result.message === 'string' && result.stack) {
		const pe = processError(result);
		if (meta.expectError && (pe.type === meta.expectError || pe.message.includes(meta.expectError))) {
			run.status = STATUS.PASS;
		} else {
			run.status = STATUS.FAIL;
			run.error = pe;
		}
	} else if (result === false) {
		run.status = STATUS.FAIL;
	} else {
		if (meta.expectError) {
			run.status = STATUS.FAIL;
			run.error = processError(new AssertError(`expected for error "${meta.expectError}" but not happened`));
		} else {
			run.status = STATUS.PASS;
		}
	}
	run.assertions = assertions;
}

function processError(error) {
	const replaceable = globalThis.location.origin;
	const stacktrace = error.stack.split(/\r\n|\r|\n/)
		.map(l => l.trim())
		.map(l => l.replace(replaceable, ''));
	stacktrace.shift();

	return {
		name: error.name,
		type: error.constructor.name,
		message: error.message,
		stacktrace: stacktrace
	};
}
