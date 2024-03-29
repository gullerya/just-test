/**
 * NodeJS specific SESSION runner
 * - runs in its own worker (indifferent to it anyway)
 * - interacts with the JustTest server over the standard REST APIs
 * - manages tests execution: worker, lifecycle reporting
 */

import url from 'node:url';
import { workerData, Worker } from 'node:worker_threads';
import * as serverAPI from '../../server-api-service.js';
import SimpleStateService from '../../simple-state-service.js';
import { runSession } from '../../session-service.js';
import { setExecutionContext, EXECUTION_MODES } from '../../environment-config.js';
import { EVENT, STATUS } from '../../../common/constants.js';

(async () => {
	const { sesId, envId, origin } = workerData;
	const stateService = new SimpleStateService();
	try {
		const metadata = await serverAPI.getSessionMetadata(sesId, envId, origin);
		stateService.setSessionId(metadata.sessionId);
		stateService.setEnvironmentId(metadata.id);

		console.info(`planning session '${envId}':'${sesId}' contents (suites/tests)...`);
		await planSession(metadata.testPaths, stateService);

		const testExecutor = createNodeJSExecutor(metadata, stateService);
		await runSession(stateService, testExecutor);
	} catch (e) {
		stateService.reportError(e);
		console.error(e);
		console.error('session execution failed due to the previous error/s');
	} finally {
		console.info(`reporting '${envId}':'${sesId}' results...`);
		const sessionResult = stateService.getResult();
		await serverAPI.reportSessionResult(sesId, envId, origin, sessionResult);
		console.info(`session '${envId}':'${sesId}' finalized`);
	}
})();

// internals
//
async function planSession(testsResources, stateService) {
	const started = globalThis.performance.now();

	console.info(`fetching ${testsResources.length} test resource/s...`);
	for (const tr of testsResources) {
		try {
			const execContext = setExecutionContext(EXECUTION_MODES.PLAN);
			execContext.suiteName = tr;
			await import(url.pathToFileURL(tr));
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
			console.error(`failed to process '${tr}': `, e);
		}
	}

	const ended = globalThis.performance.now();
	console.info(`... ${testsResources.length} test resource/s fetched (planning phase) in ${(ended - started).toFixed(1)}ms`);
}

function createNodeJSExecutor(sessionMetadata, stateService) {
	const workerUrl = new URL('./nodejs-test-box.js', import.meta.url);

	return (test, suiteName) => {
		//	TODO: this should be resource pooled
		const worker = new Worker(workerUrl);

		return new Promise(resolve => {
			worker.on('message', async message => {
				const { type, testName, run } = message;
				if (type === EVENT.RUN_START) {
					stateService.updateRunStarted(suiteName, testName);
				} else if (type === EVENT.RUN_END) {
					stateService.updateRunEnded(suiteName, testName, run);
					await worker.terminate();
					worker.unref();
					resolve();
				}
			});
			worker.on('error', async error => {
				console.error(`worker for test '${test.name}' errored: ${error}, stack: ${error.stack}`);
				stateService.updateRunEnded(suiteName, test.name, { status: STATUS.ERROR, error });
				await worker.terminate();
				worker.unref();
				resolve();
			});

			worker.postMessage({
				testName: test.name,
				suiteName,
				testSource: test.source,
				coverage: sessionMetadata.coverage
			});
		});
	};
}