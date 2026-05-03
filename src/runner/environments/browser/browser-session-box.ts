/**
 * Browser specific SESSION runner
 * - runs as part of automation or interactive
 * - interacts with the JustTest server over the standard REST APIs
 * - manages tests execution: frames/workers, lifecycle reporting
 */

import Logger from '../../../logging/logger.ts';
import { OrchestratorClient } from '../../../server/orchestrator-client.ts';
import StateService from '../../state-service.ts';
import { runSession } from '../../session-service.ts';
import { planSession } from '../../session-planner.ts';
import { ENVIRONMENT_KEYS } from '../../environment-config.ts';
import { EVENT, STATUS } from '../../../common/constants.ts';
import { getTestId } from '../../../common/interop-utils.ts';
import { TestError } from '../../../testing/model/test-error.ts';
import { TestRun } from '../../../testing/model/test-run.ts';

const logger = new Logger({ context: 'browser-session-box' });

(async () => {
	const { sesId, envId, serverOrigin } = await getEnvironmentConfig();
	const client = new OrchestratorClient(serverOrigin);
	const stateService = new StateService();
	try {
		const metadata = await client.getEnvironmentMetadata(sesId, envId);
		stateService.session.sessionId = metadata.sessionId;
		stateService.session.environmentId = metadata.id;

		logger.info(`planning session '${envId}':'${sesId}' contents (suites/tests)...`);
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
		if (metadata.coverageEnabled && executorType !== 'page') {
			collapseToSessionCoverage(stateService.session);
		}
	} catch (e) {
		stateService.reportError(TestError.fromError(e));
		logger.error(e);
		logger.error('session execution failed due to the previous error/s');
	} finally {
		logger.info(`reporting '${envId}':'${sesId}' results...`);
		const sessionResult = stateService.session;
		await client.reportEnvironmentResult(sesId, envId, sessionResult);
		logger.info(`session '${envId}':'${sesId}' finalized`);
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
	logger.info('preparing IFrame executors factory');

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
				setupWorkerEvents(stateService, f.contentWindow, test, metadata.coverageEnabled, suiteName, mc, resolve);
			}, { once: true });
		});
	};
}

function getPageExecutor(metadata, stateService) {
	logger.info('preparing Page executors factory');

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
				setupWorkerEvents(stateService, page, test, metadata.coverageEnabled, suiteName, mc, resolve);
			}, { once: true });
		});
	};
}

function getWorkerExecutorFactory(metadata, stateService) {
	logger.info('preparing WebWorker executors factory');

	const workerUrl = new URL('./browser-test-box.js', import.meta.url);

	return (test, suiteName) => {
		//	TODO: this should be resource pooled
		const worker = new Worker(workerUrl, { type: 'module' });

		return new Promise(resolve => {
			const mc = setupMessaging(stateService, suiteName, resolve);
			setupWorkerEvents(stateService, worker, test, metadata.coverageEnabled, suiteName, mc, resolve);
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
			//	run arrives as a plain object across postMessage; rehydrate
			//	so TestRun#error setter accepts the payload (see test-box)
			stateService.updateRunEnded(suiteName, testName, rehydrateRun(run));
			resolve();
		}
	});
	mc.port1.start();

	return mc;
}

function setupWorkerEvents(stateService, worker, test, coverageEnabled, suiteName, mc, resolve) {
	worker.addEventListener('error', ee => {
		logger.error(`worker for test '${test.name}' errored: ${ee}`);
		const crashRun = new TestRun();
		crashRun.status = STATUS.ERROR;
		crashRun.error = ee.error ?? new Error(String(ee.message ?? ee));
		stateService.updateRunEnded(suiteName, test.name, crashRun);
		resolve();
	});

	if (worker instanceof Worker) {
		worker.postMessage({
			testName: test.name,
			suiteName,
			testSource: test.source,
			coverageEnabled,
			port: mc.port2
		}, [mc.port2]);
	} else {
		worker.postMessage({
			testName: test.name,
			suiteName,
			testSource: test.source,
			coverageEnabled
		}, '*', [mc.port2]);
	}
}

function rehydrateRun(plain: any): TestRun {
	const run = new TestRun();
	run.status = plain.status;
	run.time = plain.time ?? 0;
	run.timestamp = plain.timestamp ?? 0;
	run.coverage = plain.coverage ?? null;
	if (plain.error) {
		run.error = rehydrateError(plain.error);
	}
	return run;
}

function rehydrateError(plain: any): TestError {
	const e: any = new Error(plain.message ?? '');
	e.name = plain.name ?? 'Error';
	e.stack = plain.stack ?? '';
	if (plain.cause) {
		e.cause = rehydrateError(plain.cause);
	}
	const te = TestError.fromError(e);
	return new (TestError as any)(te.name, plain.type ?? te.type, te.message, te.stack, te.cause);
}