/**
 * NodeJS specific session runner
 * - obtains the environment configuration
 * - sets up object model in the NodeJS environment way
 */

import url from 'node:url';
import { workerData, Worker } from 'node:worker_threads';
import * as serverAPI from '../../server-api-service.js';
import SimpleStateService from '../../simple-state-service.js';
import { runSession } from '../../session-service.js';
import { installExecutionContext, EXECUTION_MODES } from '../../environment-config.js';
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

		await runSession(stateService, executeInNodeJS);

		console.info(`collecting results...`);
		sesEnvResult = stateService.getAll();
	} catch (e) {
		console.error(e);
		console.error('session execution failed due to the previous error/s');
		//	TODO: the below one should probably be replaced with the error state
		sesEnvResult = stateService.getAll();
	} finally {
		console.log(sesEnvResult.suites[0]);
		await serverAPI.reportSessionResult(envConfig.sesId, envConfig.envId, envConfig.origin, sesEnvResult);
	}
})();

async function registerSession(testsResources, stateService) {
	const started = globalThis.performance.now();
	console.info(`fetching ${testsResources.length} test resource/s...`);

	for (const tr of testsResources) {
		await new Promise(resolve => {
			try {
				const execContext = installExecutionContext(EXECUTION_MODES.SESSION);
				execContext.parentPort.on('message', testConfigs => {
					for (const tc of testConfigs) {
						tc.source = tr;
						stateService.addTest(tc);
					}
					resolve();
				});
				import(url.pathToFileURL(tr));
			} catch (e) {
				console.error(`failed to process '${tr}': `, e);
				resolve();
			}
		});
	}

	const ended = globalThis.performance.now();
	console.info(`... ${testsResources.length} test resource/s fetched (registration phase) in ${(ended - started).toFixed(1)}ms`);
}

async function executeInNodeJS(test, stateService) {
	const worker = new Worker(
		new URL('./nodejs-test-runner.js', import.meta.url),
		{
			workerData: {
				testId: test.id,
				testSource: test.source
			}
		}
	);
	worker.on('message', message => {
		if (message.type === EVENT.RUN_STARTED) {
			stateService.updateRunStarted(message.suiteName, message.testName);
		} else if (message.type === EVENT.RUN_ENDED) {
			stateService.updateRunEnded(message.suiteName, message.testName, message.run);
		}
	});
	worker.on('exit', exitCode => {
		console.info(`worker exited with code ${exitCode}`);
	});

	return Promise.resolve(worker);
}