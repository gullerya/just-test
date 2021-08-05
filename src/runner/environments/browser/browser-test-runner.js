import { getSuiteFactory } from '../test-runner.js';
import { TestRunWorker, ENVIRONMENT_TYPES } from '../../ipc-service/ipc-service.js';
import { TESTBOX_ENVIRONMENT_KEYS } from '../../../common/constants.js';
import '/libs/chai/chai.js';

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
	globalThis.getSuite = getSuiteFactory(test, childToParentIPC);
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
