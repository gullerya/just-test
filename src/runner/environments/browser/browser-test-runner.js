import { getSuiteFactory } from '../test-runner.js';
import { TestRunWorker } from '../../ipc-service/ipc-service-browser.js';
import { INTEROP_NAMES, TESTBOX_ENVIRONMENT_KEYS } from '../../../common/constants.js';
import '/libs/chai/chai.js';

//	flow starts from parent's IPC handshake
globalThis.addEventListener('message', me => {
	if (me.data === INTEROP_NAMES.IPC_HANDSHAKE) {
		const childToParentIPC = new TestRunWorker(me.ports[0]);
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

async function initEnvironment(test, ipc) {
	const isCoverage = Boolean(globalThis[INTEROP_NAMES.REGISTER_TEST_FOR_COVERAGE]);
	console.log(isCoverage)
	if (isCoverage) {
		await globalThis[INTEROP_NAMES.REGISTER_TEST_FOR_COVERAGE](test.id);
	}

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
