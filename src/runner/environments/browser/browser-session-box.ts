/**
 * Browser specific SESSION runner
 * - runs as part of automation or interactive
 * - interacts with the JustTest server over the standard REST APIs
 * - manages tests execution: frames/workers, lifecycle reporting
 */

import { OrchestratorClient } from '../../../server/orchestrator-client.ts';
import SimpleStateService from '../../simple-state-service.ts';
import { runSession } from '../../session-service.ts';
import { planSession } from '../../session-planner.ts';
import { ENVIRONMENT_KEYS } from '../../environment-config.ts';
import { EVENT, STATUS } from '../../../common/constants.ts';
import { getTestId } from '../../../common/interop-utils.ts';
import { TestError } from '../../../testing/model/test-error.ts';

(async () => {
	const { sesId, envId, serverOrigin } = await getEnvironmentConfig();
	const client = new OrchestratorClient(serverOrigin);
	const stateService = new SimpleStateService();
	try {
		const metadata = await client.getEnvironmentMetadata(sesId, envId);
		stateService.session.sessionId = metadata.sessionId;
		stateService.session.environmentId = metadata.id;

		console.info(`planning session '${envId}':'${sesId}' contents (suites/tests)...`);
		await planSession(metadata.testPaths, stateService, src => `/static/${src}`);

		let testExecutor;
		const executorType = metadata.browser.executors?.type ?? 'iframe';
		switch (executorType) {
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

		//	iframe tests share one V8 with the host page, so per-test
		//	coverage attribution is nominal — the last-to-finish test
		//	received the aggregated bracket. collapse those into a
		//	session-global field so the backend can emit an honest
		//	`__session__` lcov record. worker mode produces no coverage;
		//	page mode has real per-test attribution and is left alone.
		if (metadata.coverage && executorType !== 'page') {
			collapseToSessionCoverage(stateService.session);
		}
	} catch (e) {
		stateService.reportError(TestError.fromError(e));
		console.error(e);
		console.error('session execution failed due to the previous error/s');
	} finally {
		console.info(`reporting '${envId}':'${sesId}' results...`);
		const sessionResult = stateService.session;
		await client.reportEnvironmentResult(sesId, envId, sessionResult);
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

function collapseToSessionCoverage(session) {
	const merged = [];
	for (const suite of session.suites) {
		for (const t of suite.tests) {
			if (t.lastRun?.coverage?.length) {
				merged.push(...t.lastRun.coverage);
				t.lastRun.coverage = null;
			}
		}
	}
	if (merged.length) {
		session.coverage = merged;
	}
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
		f.src = executorUrl.toString();
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

	const baseExecutorUrl = new URL('./browser-test-box.html', import.meta.url);
	baseExecutorUrl.searchParams.append(ENVIRONMENT_KEYS.SESSION_ID, metadata.sessionId);
	baseExecutorUrl.searchParams.append(ENVIRONMENT_KEYS.ENVIRONMENT_ID, metadata.id);

	return (test, suiteName) => {
		//	TODO: this should be resource pooled
		//	per-test URL lets the server-side browser env key coverage by test
		const executorUrl = new URL(baseExecutorUrl);
		executorUrl.searchParams.append(ENVIRONMENT_KEYS.TEST_ID, getTestId(suiteName, test.name));
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
			resolve();
		}
	});
	mc.port1.start();

	return mc;
}

function setupWorkerEvents(stateService, worker, test, coverage, suiteName, mc, resolve) {
	worker.addEventListener('error', ee => {
		console.error(`worker for test '${test.name}' errored: ${ee}`);
		stateService.updateRunEnded(suiteName, test.name, { status: STATUS.ERROR, error: TestError.fromError(ee.error) });
		resolve();
	});

	if (worker instanceof Worker) {
		worker.postMessage({
			testName: test.name,
			suiteName,
			testSource: test.source,
			coverage,
			port: mc.port2
		}, [mc.port2]);
	} else {
		worker.postMessage({
			testName: test.name,
			suiteName,
			testSource: test.source,
			coverage
		}, '*', [mc.port2]);
	}
}