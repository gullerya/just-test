import { Session } from 'node:inspector';
import { cwd } from 'node:process';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { parentPort } from 'node:worker_threads';
import { EXECUTION_MODES, setExecutionContext } from '../../environment-config.ts';
import { filterV8Coverage } from '../../../coverage/coverage-service.ts';
import { EVENT, STATUS } from '../../../common/constants.ts';
import { TestError } from '../../../testing/model/test-error.ts';
import { TestRun } from '../../../testing/model/test-run.ts';

const currentBase = pathToFileURL(cwd()).href;
let testName;
let coverageEnabled = false;
let coverageInclude: string[] = [];

parentPort.addEventListener('message', async (m: MessageEvent) => {
	const { testName: tName, testSource, coverageEnabled: cov, coverageInclude: inc } = m.data;
	testName = tName;
	coverageEnabled = Boolean(cov);
	coverageInclude = Array.isArray(inc) ? inc : [];

	if (coverageEnabled) {
		sessionPost = await initCoverage();
	}

	setExecutionContext(EXECUTION_MODES.TEST, testName, runStartHandler, runEndHandler);
	try {
		await import(pathToFileURL(testSource).toString());
	} catch (e) {
		console.error(`failed to import test '${testName}':`, e);
		const run = new TestRun();
		run.status = STATUS.ERROR;
		run.time = 0;
		run.timestamp = Date.now();
		run.error = TestError.fromError(e);
		await runEndHandler(testName, run);
	}
});

//
// internal methods
//
let sessionPost;
async function runStartHandler(tName: string): Promise<void> {
	if (tName !== testName) {
		throw new Error(`expected to get result of test '${testName}', but received of '${tName}'`);
	}
	parentPort.postMessage({ type: EVENT.RUN_START, testName });
}

async function runEndHandler(tName: string, run: TestRun): Promise<void> {
	if (tName !== testName) {
		throw new Error(`expected to get result of test '${testName}', but received of '${tName}'`);
	}
	if (coverageEnabled) {
		try {
			//	raw V8 coverage, URL-normalized + filtered; conversion to
			//	`just-test` FileCov happens at the host (see
			//	`convertSessionCoverage` in coverage-service.ts)
			run.coverage = await collectCoverage();
		} catch (e) {
			console.error(`failed to collect coverage of '${testName}': ${e}`);
		}
	}
	//	structured-clone on postMessage drops class identity AND private
	//	fields (TestRun stores #error), so serialize explicitly via toJSON
	//	so the error payload actually crosses the worker boundary
	parentPort.postMessage({ type: EVENT.RUN_END, testName, run: run.toJSON() });
}

//	TODO: consider to move to coverage service
async function initCoverage() {
	const session = new Session();
	session.connect();
	const sessionPostProm = promisify(session.post).bind(session);

	await sessionPostProm('Profiler.enable');
	await sessionPostProm('Profiler.startPreciseCoverage', { callCount: true, detailed: true });

	return sessionPostProm;
}

//	TODO: consider to move to coverage service
async function collectCoverage() {
	const rawCov = await sessionPost('Profiler.takePreciseCoverage');
	const normalized = rawCov.result.map(entry => {
		const currentBaseIndex = entry.url.indexOf(currentBase);
		const entryUrl = currentBaseIndex < 0
			? ''
			: `.${entry.url.substring(currentBaseIndex + currentBase.length)}`;
		return {
			url: entryUrl,
			functions: entry.functions
		};
	});
	return filterV8Coverage(normalized, coverageInclude);
}