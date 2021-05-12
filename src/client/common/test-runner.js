import { DEFAULT, STATUS } from './constants.js';
import { TestAsset } from './test-asset.js';
import { TestRun } from './test-run.js';

export {
	runTest
}

class AssertError extends Error { }

class TimeoutError extends AssertError { }

async function runTest(code, meta = { ttl: DEFAULT }) {
	let runResult;
	const run = new TestRun();
	const testAsset = new TestAsset();

	//	TODO: react on skip here as well?
	const start = performance.now();
	try {
		runResult = await Promise.race([
			new Promise(resolve => setTimeout(resolve, meta.ttl, new TimeoutError('timeout'))),
			new Promise(resolve => Promise.resolve(code(testAsset)).then(resolve).catch(resolve))
		]);
	} catch (e) {
		runResult = e;
	} finally {
		run.time = performance.now() - start;
		finalizeRun(meta, run, runResult, testAsset.assertions);
	}

	return run;
}

function finalizeRun(meta, run, result, assertions) {
	if (result instanceof Error) {
		const pe = processError(result);
		if (meta.expectError && (pe.type === meta.expectError || pe.message.includes(meta.expectError))) {
			run.status = STATUS.PASS;
		} else {
			run.status = STATUS.FAIL;
			run.error = pe;
		}
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
	const replacable = globalThis.location.origin;
	const stackLines = error.stack.split(/\r\n|\r|\n/)
		.map(l => l.trim())
		.map(l => l.replace(replacable, ''));
	stackLines.shift();

	return {
		name: error.name,
		type: error.constructor.name,
		message: error.message,
		stackLines: stackLines
	};
}
