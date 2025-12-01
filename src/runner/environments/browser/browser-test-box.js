import { EVENT, STATUS } from '../../../common/constants.js';
import { TestRun } from '../../../testing/model/test-run.ts';
import { TestError } from '../../../testing/model/test-error.ts';
import { EXECUTION_MODES, setExecutionContext } from '../../environment-config.js';

let parentPort;
let externalizedTestName;

globalThis.addEventListener('message', async m => {
	parentPort = m.ports?.[0] ? m.ports[0] : m.data?.port;

	if (parentPort) {
		const { testName, testSource } = m.data;
		externalizedTestName = testName;

		setExecutionContext(EXECUTION_MODES.TEST, testName, runStartHandler, runEndHandler);

		try {
			await import(`/static/${testSource}`);
		} catch (e) {
			console.error(`failed to import test source for '${testName}' from '/static/${testSource}'`, e);
			const run = new TestRun();
			run.timestamp = Date.now();
			run.status = STATUS.ERROR;
			run.error = TestError.fromError(e);
			runEndHandler(testName, run);
		}
	} else {
		console.warn(`unexpected message from parent: ${JSON.stringify(m.data)}`);
	}
});

//
// internal methods
//
function runStartHandler(testName) {
	if (testName !== externalizedTestName) {
		throw new Error(`expected to get result of test '${externalizedTestName}', but received of '${testName}'`);
	}
	parentPort.postMessage({ type: EVENT.RUN_START, testName: testName });
}

function runEndHandler(testName, run) {
	if (testName !== externalizedTestName) {
		throw new Error(`expected to get result of test '${externalizedTestName}', but received of '${testName}'`);
	}
	parentPort.postMessage({ type: EVENT.RUN_END, testName: testName, run });
}