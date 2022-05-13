import { DEFAULT, STATUS } from '../../common/constants.js';
import { TestRun } from '../../common/models/tests/test-run.js';
import { TestError } from '../../common/models/tests/test-error.js';
import { getTestId, getValidName } from '../../common/interop-utils.js';

export {
	getSuiteFactory
}

class AssertError extends Error { }

class TimeoutError extends AssertError { }

function getSuiteFactory(test, childToParentIPC) {
	return function getSuite(suiteName) {
		const sName = getValidName(suiteName);

		return {
			test: async (testName, testCode) => {
				const tName = getValidName(testName);
				const testId = getTestId(sName, tName);

				if (testId !== test.id) {
					return;
				}

				childToParentIPC.sendRunStarted(test.id);
				const run = await runTest(testCode, test.config);
				childToParentIPC.sendRunResult(test.id, run);
			}
		}
	};
}

async function runTest(code, config = { ttl: DEFAULT.TEST_RUN_TTL }) {
	let runResult;
	const run = new TestRun();
	run.timestamp = Date.now();

	const start = globalThis.performance.now();
	try {
		runResult = await Promise.race([
			new Promise(resolve => setTimeout(resolve, config.ttl, new TimeoutError(`run exceeded ${config.ttl}ms`))),
			Promise.resolve(code({}))
		]);
	} catch (e) {
		runResult = e;
	} finally {
		run.time = Math.round((globalThis.performance.now() - start) * 10000) / 10000;
		finalizeRun(config, run, runResult);
	}

	return run;
}

function finalizeRun(config, run, result) {
	let runError = null;
	if (result && typeof result.name === 'string' && typeof result.message === 'string' && result.stack) {
		runError = processError(result);
		if (config.expectError && (runError.type === config.expectError || runError.message.includes(config.expectError))) {
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
	} else {
		if (config.expectError) {
			run.status = STATUS.FAIL;
			runError = processError(new AssertError(`expected for error "${config.expectError}" but not happened`));
		} else {
			run.status = STATUS.PASS;
		}
	}
	run.error = runError;
}

function processError(error) {
	const replaceable = globalThis.location?.origin || '';
	const stacktrace = error.stack.split(/\r\n|\r|\n/)
		.map(l => l.trim())
		.map(l => l.replace(replaceable, ''))
		.map(l => l.replace(/^\s*at\s*/, ''))
		.filter(Boolean);
	stacktrace.shift();

	return new TestError(
		error.name,
		error.constructor.name,
		error.message,
		stacktrace
	);
}
