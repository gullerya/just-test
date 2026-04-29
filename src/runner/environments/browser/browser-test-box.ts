import { EVENT, STATUS } from '../../../common/constants.ts';
import { TestRun } from '../../../testing/model/test-run.ts';
import { TestError } from '../../../testing/model/test-error.ts';
import { EXECUTION_MODES, setExecutionContext } from '../../environment-config.ts';

//	workers have no `window` and no Playwright `exposeBinding` reaches them,
//	so the same symmetric start/stop calls still run but resolve to no-ops.
//	iframe/page modes get real bindings injected by Playwright on the host
//	page (iframe shares host V8; page has its own).
if (typeof globalThis.document === 'undefined') {
	globalThis.__jtStartCoverage = async () => { };
	globalThis.__jtStopCoverage = async () => [];
}

let parentPort;
let externalizedTestName;
let coverageEnabled = false;

globalThis.addEventListener('message', async m => {
	parentPort = m.ports?.[0] ? m.ports[0] : m.data?.port;

	if (parentPort) {
		const { testName, testSource, coverage } = m.data;
		externalizedTestName = testName;
		coverageEnabled = Boolean(coverage) && typeof globalThis.__jtStartCoverage === 'function';

		if (coverageEnabled) {
			try {
				await globalThis.__jtStartCoverage();
			} catch (e) {
				console.warn(`failed to start coverage for '${testName}':`, e);
				coverageEnabled = false;
			}
		}

		setExecutionContext(EXECUTION_MODES.TEST, testName, runStartHandler, runEndHandler);

		try {
			await import(`/static/${testSource}`);
		} catch (e) {
			console.error(`failed to import test source for '${testName}' from '/static/${testSource}'`, e);
			const run = new TestRun();
			run.timestamp = Date.now();
			run.status = STATUS.ERROR;
			run.error = TestError.fromError(e);
			await runEndHandler(testName, run);
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
	parentPort.postMessage({ type: EVENT.RUN_START, testName });
}

async function runEndHandler(testName, run) {
	if (testName !== externalizedTestName) {
		throw new Error(`expected to get result of test '${externalizedTestName}', but received of '${testName}'`);
	}
	if (coverageEnabled) {
		try {
			const coverage = await globalThis.__jtStopCoverage();
			if (Array.isArray(coverage) && coverage.length) {
				run.coverage = coverage;
			}
		} catch (e) {
			console.warn(`failed to stop coverage for '${testName}':`, e);
		}
	}
	parentPort.postMessage({ type: EVENT.RUN_END, testName, run });
}
