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
import { EVENT, STATUS } from '../../../common/constants.js';

(async () => {
	const { sesId, envId, serverOrigin } = await getEnvironmentConfig();
	const stateService = new SimpleStateService();
	try {
		const metadata = await serverAPI.getSessionMetadata(sesId, envId, serverOrigin);
		stateService.setSessionId(metadata.sessionId);
		stateService.setEnvironmentId(metadata.id);

		console.info(`planning session '${envId}':'${sesId}' contents (suites/tests)...`);
		await planSession(metadata.testPaths, stateService);

		const testExecutor = metadata.browser.executors?.type === 'iframe'
			? getIFrameExecutorFactory(metadata, stateService)
			: getWorkerExecutorFactory(metadata, stateService);
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
})();

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

function getIFrameExecutorFactory(metadata, stateService) {
	console.info('preparing IFrame executors factory');

	const iframeUrl = new URL('./browser-test-box.html', import.meta.url);
	iframeUrl.searchParams.append(ENVIRONMENT_KEYS.SESSION_ID, metadata.sessionId);
	iframeUrl.searchParams.append(ENVIRONMENT_KEYS.ENVIRONMENT_ID, metadata.id);

	return (test, suiteName) => {
		//	TODO: this should be reasource pooled
		const d = globalThis.document;
		const f = d.createElement('iframe');
		f.name = test.name;
		f.src = iframeUrl;
		d.body.appendChild(f);

		const mc = new MessageChannel();

		return new Promise(resolve => {
			mc.port1.addEventListener('message', message => {
				const { type, testName, run } = message.data;
				if (type === EVENT.RUN_START) {
					stateService.updateRunStarted(suiteName, testName);
				} else if (type === EVENT.RUN_END) {
					stateService.updateRunEnded(suiteName, testName, run);
					resolve();
				}
			});
			mc.port1.start();
			f.addEventListener('load', () => {
				f.contentWindow.addEventListener('error', ee => {
					console.error(`worker for test '${test.name}' errored: ${ee}`);
					stateService.updateRunEnded(suiteName, test.name, { status: STATUS.ERROR, error: ee.error });
					mc.port1.close();
					mc.port2.close();
					resolve();
				});

				f.contentWindow.postMessage({
					testName: test.name,
					testSource: test.source,
					coverage: metadata.coverage
				}, '*', [mc.port2]);
			}, { once: true });
		});
	};
}

// function createPageExecutor(metadata, stateService) {
// 	return (test, suiteName) => { };
// }

// function getWorkerExecutorFactory(_metadata, stateService) {
// 	console.info('preparing WebWorker executors factory');

// 	const workerUrl = new URL('./browser-test-box.js', import.meta.url);

// 	return (test, suiteName) => {
// 		//	TODO: this should be reasource pooled
// 		const worker = new Worker(workerUrl, { type: 'module' });

// 		return new Promise(resolve => {
// 			worker.addEventListener('message', message => {
// 				const { type, testName, run } = message.data;
// 				if (type === EVENT.RUN_INIT_REQUEST) {
// 					worker.postMessage({
// 						type: EVENT.RUN_INIT_RESPONSE,
// 						testName: test.name,
// 						testSource: test.source,
// 						coverage: null
// 					});
// 				} else if (type === EVENT.RUN_START) {
// 					stateService.updateRunStarted(suiteName, testName);
// 				} else if (type === EVENT.RUN_END) {
// 					stateService.updateRunEnded(suiteName, testName, run);
// 					resolve();
// 				}
// 			});
// 			worker.addEventListener('error', ee => {
// 				console.error(`worker for test '${test.name}' errored: ${ee}`);
// 				stateService.updateRunEnded(suiteName, test.name, { status: STATUS.ERROR, error: ee.error });
// 				resolve();
// 			});
// 		});
// 	};
// }
