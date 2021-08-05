import { TestRunWorker, ENVIRONMENT_TYPES } from '../../ipc-service/ipc-service.js';
import { STATUS, TESTBOX_ENVIRONMENT_KEYS } from '../../../common/constants.js';
import { getTestId, getValidName } from '../../../common/interop-utils.js';
import { TestRun } from '../../../common/models/tests/test-run.js';
import { TestAsset } from '../../om/test-asset.js';
import { TestError } from '../../../common/models/tests/test-error.js';
import { perfReady } from '../../../common/performance-utils.js';

class AssertError extends Error { }

class TimeoutError extends AssertError { }

const childToParentIPC = new TestRunWorker(ENVIRONMENT_TYPES.BROWSER, globalThis.opener ?? globalThis.parent);

//	main flow
getTest()
	.then(test => {
		return initEnvironment(test);
	})
	.then(test => {
		return import(`/tests/${test.source}`);
	})
	.catch(e => {
		//	report test failure due to the error
		console.error(e);
	});

async function getTest() {
	const envTestSetup = getEnvTestSetup();
	const test = await childToParentIPC.getTestConfig(envTestSetup.testId);
	return test;
}

function initEnvironment(test) {
	globalThis.getSuite = function getSuite(suiteName) {
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
	}
	return test;
}

function getEnvTestSetup() {
	let result = null;
	const sp = new URL(globalThis.location.href).searchParams;
	if (sp) {
		const testId = decodeURIComponent(sp.get(TESTBOX_ENVIRONMENT_KEYS.TEST_ID));
		if (testId) {
			result = {
				testId: testId
			};
		}
	}
	return result;
}

async function runTest(code, config) {
	let runResult;
	const run = new TestRun();
	run.timestamp = Date.now();

	const testAsset = new TestAsset();

	const
		P = await perfReady,
		start = P.now();
	try {
		runResult = await Promise.race([
			new Promise(resolve => setTimeout(resolve, config.ttl, new TimeoutError(`run exceeded ${config.ttl}ms`))),
			Promise.resolve(code(testAsset))
		]);
	} catch (e) {
		runResult = e;
	} finally {
		run.time = Math.round((P.now() - start) * 10000) / 10000;
		finalizeRun(config, run, runResult, testAsset.assertions);
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
