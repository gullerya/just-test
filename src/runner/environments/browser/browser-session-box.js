/**
 * Browser specific SESSION runner
 * - runs as part of automation or interactive
 * - interacts with the JustTest server over the standard REST APIs
 * - manages tests execution: frames/workers, lifecycle reporting
 */

import * as serverAPI from '../../server-api-service.js';
import SimpleStateService from '../../simple-state-service.js';
import { runSession } from '../../session-service.js';
import { ENVIRONMENT_KEYS, EXECUTION_MODES, setExecutionContext } from '../../environment-config.js';

const { sesId, envId, serverOrigin } = await getEnvironmentConfig();
const stateService = new SimpleStateService();
try {
	const metadata = await serverAPI.getSessionMetadata(sesId, envId, serverOrigin);
	stateService.setSessionId(metadata.sessionId);
	stateService.setEnvironmentId(metadata.id);

	console.info(`planning session '${envId}':'${sesId}' contents (suites/tests)...`);
	await planSession(metadata.testPaths, stateService);

	const testExecutor = createIFrameExecutor(metadata, stateService);
	await runSession(stateService, testExecutor);
} catch (e) {
	stateService.reportError(e);
	console.error(e);
	console.error('session execution failed due to the previous error/s');
} finally {
	console.info(`reporting '${envId}':'${sesId}' results...`);
	const sessionResult = stateService.getResult();
	await serverAPI.reportSessionResult(sesId, envId, serverOrigin, sessionResult);
	console.info(`session '${envId}':'${sesId}' finalized`);
}

// internals
//
function getEnvironmentConfig() {
	const sp = new URL(globalThis.location.href).searchParams;
	return {
		sesId: sp.get(ENVIRONMENT_KEYS.SESSION_ID),
		envId: sp.get(ENVIRONMENT_KEYS.ENVIRONMENT_ID),
		serverOrigin: globalThis.location.origin
	};
}

async function planSession(testsResources, stateService) {
	const started = globalThis.performance.now();

	console.info(`fetching ${testsResources.length} test resource/s...`);
	for (const tr of testsResources) {
		try {
			const execContext = setExecutionContext(EXECUTION_MODES.PLAN);
			execContext.suiteName = tr;
			await import(`/tests/${tr}`);
			for (const { name, config } of execContext.testConfigs) {
				stateService.addTest({
					name,
					config,
					source: tr,
					suiteName: execContext.suiteName,
					runs: []
				});
			}
		} catch (e) {
			console.error(`failed to process '${tr}':`);
			console.error(e);
		}
	}

	const ended = globalThis.performance.now();
	console.info(`... ${testsResources.length} test resource/s fetched (planning phase) in ${(ended - started).toFixed(1)}ms`);
}

function createIFrameExecutor(metadata, stateService) {
	return (test, suiteName) => {
		const encTestId = encodeURIComponent(test.id);
		const d = globalThis.document;
		const f = d.createElement('iframe');
		f.name = encTestId;
		f.classList.add('just-test-execution-frame');
		f.src = `/core/runner/environments/browser/browser-test-runner.html?${ENVIRONMENT_KEYS.TEST_ID}=${encTestId}`;

		// inject context and let is start running the code
		// get info and upon report of test resolve and exit

		return new Promise(resolve => {
			//	resolve on done
			resolve();
		});
	};
}

function createPageExecutor(metadata, stateService) {
	return (test, suiteName) => { };
}

function createWebWorkerExecutor(metadata, stateService) {
	const workerUrl = new URL('./nodejs-test-box.js', import.meta.url);

	return (test, suiteName) => {
		//	TODO: this should be reasource pooled
		const worker = new Worker(workerUrl, {
			workerData: {
				testName: test.name,
				testSource: test.source,
				coverage: sessionMetadata.coverage
			}
		});
		//	TODO: the basic messaging interaction shoule be done via BroadcastChannel
		worker.on('message', message => {
			const { type, testName, run } = message;
			if (type === EVENT.RUN_START) {
				stateService.updateRunStarted(suiteName, testName);
			} else if (type === EVENT.RUN_END) {
				stateService.updateRunEnded(suiteName, testName, run);
			}
		});
		worker.on('error', error => {
			console.error(`worker for test '${test.name}' errored: ${error}, stack: ${error.stack}`);
		});

		return new Promise(resolve => {
			worker.on('exit', exitCode => {
				// console.debug(`worker for test '${test.name}' exited with code ${exitCode}`);
				resolve(exitCode);
			});
		});
	};
}
