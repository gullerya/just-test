import { EVENT } from '../../../common/constants.js';
import { EXECUTION_MODES, setExecutionContext } from '../../environment-config.js';

let parentPort;
let externalizedTestName;

globalThis.addEventListener('message', async m => {
	if (m.ports?.length) {
		parentPort = m.ports[0];
		const { testName, testSource } = m.data;
		externalizedTestName = testName;

		setExecutionContext(EXECUTION_MODES.TEST, testName, runStartHandler, runEndHandler);

		import(`/static/${testSource}`);
	} else {
		console.warn(`unexpected message from parent: ${JSON.stringify(m.data)}`);
	}
});

//
// internal methods
//
function runStartHandler(tName) {
	if (tName !== externalizedTestName) {
		throw new Error(`expected to get result of test '${externalizedTestName}', but received of '${tName}'`);
	}
	parentPort.postMessage({ type: EVENT.RUN_START, testName: tName });
}

function runEndHandler(tName, run) {
	if (tName !== externalizedTestName) {
		throw new Error(`expected to get result of test '${externalizedTestName}', but received of '${tName}'`);
	}
	parentPort.postMessage({ type: EVENT.RUN_END, testName: tName, run });
}