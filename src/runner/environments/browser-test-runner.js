import { TestRunWorker, ENVIRONMENT_TYPES } from '../ipc-service/ipc-service.js';
import { STATUS } from '../../common/constants.js';
import { getTestId, getValidName } from '../../common/interop-utils.js';
import { TestRun } from '../../common/models/tests/test-run.js';
import { TestAsset } from '../om/test-asset.js';
import { TestError } from '../../common/models/tests/test-error.js';
import { perfReady } from '../../common/performance-utils.js';
import { getEnvironmentTest } from './browser-entry-point.js';

class AssertError extends Error { }

class TimeoutError extends AssertError { }

//	main flow
getTestConfig()
	.then(testConfig => {
		return initEnvironment(testConfig);
	})
	.then(testConfig => {
		loadTest(testConfig);
	})
	.catch(e => {
		//	report test failure due to the error
		console.error(e);
	});

async function getTestConfig() {
	const envTestSetup = getEnvironmentTest();

	const childToParentIPC = new TestRunWorker(ENVIRONMENT_TYPES.BROWSER, globalThis);
	const testConfig = await childToParentIPC.getTestConfig(envTestSetup.testId);
	testConfig.childToParentIPC = childToParentIPC;
	return testConfig;
}

function initEnvironment(testConfig) {
	globalThis.getSuite = function getSuite(suiteName) {
		const sName = getValidName(suiteName);

		return {
			test: async (testName, testCode) => {
				const tName = getValidName(testName);
				const testId = getTestId(sName, tName);

				if (testId !== testConfig.id) {
					return;
				}

				// this.resolveStarted();
				const run = await runTest(testCode, testConfig);
				// this.resolveEnded(run);
				testConfig.childToParentIPC.sendRunResult(run);
			}
		}
	}
	return testConfig;
}

function loadTest(testConfig) {
	import(`/tests/${testConfig.source}`);
}

async function runTest(code, meta) {
	let runResult;
	const run = new TestRun();
	run.timestamp = Date.now();

	const testAsset = new TestAsset();

	const
		P = await perfReady,
		start = P.now();
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
