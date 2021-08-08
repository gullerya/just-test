import { getSuiteFactory } from '../test-runner.js';
import { TestRunWorker, ENVIRONMENT_TYPES } from '../../ipc-service/ipc-service.js';
import { INTEROP_NAMES, TESTBOX_ENVIRONMENT_KEYS } from '../../../common/constants.js';
import '/libs/chai/chai.js';


//	flow starts from parent's IPC handshake
//	TODO: timeout on not being called?
globalThis.addEventListener('message', me => {
	if (me.data === INTEROP_NAMES.IPC_HANDSHAKE) {
		const childToParentIPC = new TestRunWorker(ENVIRONMENT_TYPES.BROWSER, me.ports[0]);
		me.ports[0].start();
		doFlow(childToParentIPC);
	}
});

//	main flow
function doFlow(ipc) {
	getTest(ipc)
		.then(test => {
			return initEnvironment(test, ipc);
		})
		.then(test => {
			return import(`/tests/${test.source}`);
		})
		.catch(e => {
			//	report test failure due to the error
			console.error(e);
		});
}

async function getTest(ipc) {
	const envTestSetup = getEnvTestSetup();
	const test = await ipc.getTestConfig(envTestSetup.testId);
	return test;
}

function initEnvironment(test, ipc) {
	globalThis.getSuite = getSuiteFactory(test, ipc);
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
