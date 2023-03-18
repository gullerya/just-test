import { EVENT, INTEROP_NAMES } from '../../../common/constants.js';
import { EXECUTION_MODES, setExecutionContext } from '../../environment-config.js';

let externalizedTestName;

globalThis.addEventListener('message', async m => {
	if (m.data.type === EVENT.RUN_INIT_RESPONSE) {
		const { testName, testSource, coverage: coverageConfig } = m.data;
		externalizedTestName = testName;

		if (coverageConfig) {
			if (typeof globalThis[INTEROP_NAMES.REGISTER_TEST_FOR_COVERAGE] === 'function') {
				await globalThis[INTEROP_NAMES.REGISTER_TEST_FOR_COVERAGE](testName);
			} else {
				console.warn('coverage required by configuration but not supported on this environment');
			}
		}

		setExecutionContext(EXECUTION_MODES.TEST, testName, runStartHandler, runEndHandler);

		import(`/tests/${testSource}`);
	} else {
		console.warn(`unexpected message from parent: ${JSON.stringify(m.data)}`);
	}
});

// this starts the chain of flow
globalThis.postMessage({
	type: EVENT.RUN_INIT_REQUEST
});

//
// internal methods
//
function runStartHandler(tName) {
	if (tName !== externalizedTestName) {
		throw new Error(`expected to get result of test '${externalizedTestName}', but received of '${tName}'`);
	}
	globalThis.postMessage({ type: EVENT.RUN_START, testName: tName });
}

function runEndHandler(tName, run) {
	if (tName !== externalizedTestName) {
		throw new Error(`expected to get result of test '${externalizedTestName}', but received of '${tName}'`);
	}
	globalThis.postMessage({ type: EVENT.RUN_END, testName: tName, run });
}