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

		let testExecutor;
		switch (metadata.browser.executors?.type) {
			case 'worker':
				testExecutor = getWorkerExecutorFactory(metadata, stateService);
				break;
			case 'page':
				testExecutor = getPageExecutor(metadata, stateService);
				break;
			case 'iframe':
			default:
				testExecutor = getIFrameExecutorFactory(metadata, stateService);
		}
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
	for (const testSource of testsResources) {
		try {
			const execContext = setExecutionContext(EXECUTION_MODES.PLAN);
			execContext.suiteName = testSource;
			await import(`/static/${testSource}`);
			for (const { name, config } of execContext.testConfigs) {
				stateService.addTest({
					name,
					config,
					source: testSource,
					suiteName: execContext.suiteName,
					runs: []
				});
			}
		} catch (e) {
			console.error(`failed to process '${testSource}':`);
			console.error(e);
		}
	}

	const ended = globalThis.performance.now();
	console.info(`... ${testsResources.length} test resource/s fetched (planning phase) in ${(ended - started).toFixed(1)}ms`);
}

function getIFrameExecutorFactory(metadata, stateService) {
	console.info('preparing IFrame executors factory');

	const executorUrl = new URL('./browser-test-box.html', import.meta.url);
	executorUrl.searchParams.append(ENVIRONMENT_KEYS.SESSION_ID, metadata.sessionId);
	executorUrl.searchParams.append(ENVIRONMENT_KEYS.ENVIRONMENT_ID, metadata.id);

	return (test, suiteName) => {
		//	TODO: this should be resource pooled
		const d = globalThis.document;
		const f = d.createElement('iframe');
		f.name = test.name;
		f.src = executorUrl;
		d.body.appendChild(f);

		return new Promise(resolve => {
			const mc = setupMessaging(stateService, suiteName, resolve);

			f.addEventListener('load', () => {
				setupWorkerEvents(stateService, f.contentWindow, test, metadata.coverage, suiteName, mc, resolve);
			}, { once: true });
		});
	};
}

function getPageExecutor(metadata, stateService) {
	console.info('preparing Page executors factory');

	const executorUrl = new URL('./browser-test-box.html', import.meta.url);
	executorUrl.searchParams.append(ENVIRONMENT_KEYS.SESSION_ID, metadata.sessionId);
	executorUrl.searchParams.append(ENVIRONMENT_KEYS.ENVIRONMENT_ID, metadata.id);

	return (test, suiteName) => {
		//	TODO: this should be resource pooled
		const page = globalThis.open(executorUrl);

		return new Promise(resolve => {
			const mc = setupMessaging(stateService, suiteName, resolve);

			page.addEventListener('load', () => {
				setupWorkerEvents(stateService, page, test, metadata.coverage, suiteName, mc, resolve);
			}, { once: true });
		});
	};
}

function getWorkerExecutorFactory(metadata, stateService) {
	console.info('preparing WebWorker executors factory');

	const workerUrl = new URL('./browser-test-box.js', import.meta.url);

	return (test, suiteName) => {
		//	TODO: this should be resource pooled
		const worker = new Worker(workerUrl, { type: 'module' });

		return new Promise(resolve => {
			const mc = setupMessaging(stateService, suiteName, resolve);
			setupWorkerEvents(stateService, worker, test, metadata.coverage, suiteName, mc, resolve);
		});
	};
}

function setupMessaging(stateService, suiteName, resolve) {
	const mc = new MessageChannel();

	mc.port1.addEventListener('message', message => {
		const { type, testName, run } = message.data;
		if (type === EVENT.RUN_START) {
			stateService.updateRunStarted(suiteName, testName);
		} else if (type === EVENT.RUN_END) {
			stateService.updateRunEnded(suiteName, testName, run);
			mc.port1.close();
			mc.port2.close();
			resolve();
		}
	});
	mc.port1.start();

	return mc;
}

function setupWorkerEvents(stateService, worker, test, coverage, suiteName, mc, resolve) {
	worker.addEventListener('error', ee => {
		console.error(`worker for test '${test.name}' errored: ${ee}`);
		stateService.updateRunEnded(suiteName, test.name, { status: STATUS.ERROR, error: ee.error });
		mc.port1.close();
		mc.port2.close();
		resolve();
	});

	worker.postMessage({
		testName: test.name,
		suiteName,
		testSource: test.source,
		coverage
	}, '*', [mc.port2]);
}