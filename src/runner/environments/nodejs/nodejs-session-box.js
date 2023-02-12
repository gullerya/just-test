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
import { EVENT } from '../../../common/constants.js';

(async () => {
	let sesEnvResult;
	let envConfig;
	const stateService = new SimpleStateService();
	try {
		envConfig = workerData;

		const metadata = await serverAPI.getSessionMetadata(envConfig.sesId, envConfig.envId, envConfig.origin);
		stateService.setSessionId(metadata.sessionId);
		stateService.setEnvironmentId(metadata.id);

		console.info(`registering session contents (suites/tests)...`);
		await registerSession(metadata.testPaths, stateService);

		const testExecutor = createNodeJSExecutor(metadata, stateService);
		await runSession(stateService, testExecutor);

		console.info(`collecting results...`);
		sesEnvResult = stateService.getAll();
	} catch (e) {
		console.error(e);
		console.error('session execution failed due to the previous error/s');
		//	TODO: the below one should probably be replaced with the error state
		sesEnvResult = stateService.getAll();
	} finally {
		await serverAPI.reportSessionResult(envConfig.sesId, envConfig.envId, envConfig.origin, sesEnvResult);
	}
})();

async function registerSession(testsResources, stateService) {
	const started = globalThis.performance.now();
	console.info(`fetching ${testsResources.length} test resource/s...`);

	for (const tr of testsResources) {
		await new Promise((resolve, reject) => {
			try {
				const execContext = setExecutionContext(EXECUTION_MODES.SESSION);
				execContext.parentPort.on('message', testConfigs => {
					for (const tc of testConfigs) {
						tc.source = tr;
						stateService.addTest(tc);
					}
					execContext.parentPort.close();
					resolve();
				});

				import(url.pathToFileURL(tr))
					.catch(e => {
						console.error(`failed to process '${tr}': `, e);
						reject(e);
					});
			} catch (e) {
				console.error(`failed to process '${tr}': `, e);
				reject(e);
			}
		});
	}

	const ended = globalThis.performance.now();
	console.info(`... ${testsResources.length} test resource/s fetched (registration phase) in ${(ended - started).toFixed(1)}ms`);
}

function createNodeJSExecutor(sessionMetadata, stateService) {
	const workerUrl = new URL('./nodejs-test-box.js', import.meta.url);

	return (test) => {
		const worker = new Worker(workerUrl, {
			workerData: {
				testId: test.id,
				testSource: test.source,
				coverage: sessionMetadata.coverage
			}
		});
		//	TODO: the basic messaging interaction shoule be done via BroadcastChannel
		worker.on('message', message => {
			if (message.type === EVENT.RUN_STARTED) {
				stateService.updateRunStarted(message.suiteName, message.testName);
			} else if (message.type === EVENT.RUN_ENDED) {
				stateService.updateRunEnded(message.suiteName, message.testName, message.run);
			}
		});
		worker.on('error', error => {
			console.error(`worker for test '${test.id}' errored: ${error}, stack: ${error.stack}`);
		});

		return new Promise(resolve => {
			worker.on('exit', exitCode => {
				console.debug(`worker for test '${test.id}' exited with code ${exitCode}`);
				resolve();
			});
		});
	};
}