/**
 * NodeJS specific SESSION runner
 * - runs in its own worker (indifferent to it anyway)
 * - interacts with the JustTest server over the standard REST APIs
 * - manages tests execution: worker, lifecycle reporting
 */

import url from 'node:url';
import { workerData, Worker } from 'node:worker_threads';
import Logger from '../../../logging/logger.ts';
import { OrchestratorClient } from '../../../server/orchestrator-client.ts';
import StateService from '../../state-service.ts';
import { runSession } from '../../session-service.ts';
import { planSession } from '../../session-planner.ts';
import { EVENT, STATUS } from '../../../common/constants.ts';
import { TestError } from '../../../testing/model/test-error.ts';
import { TestRun } from '../../../testing/model/test-run.ts';

const logger = new Logger({ context: `nodejs-${process.version.replace(/^[^0-9]+/, '')}` });

(async () => {
	const { sesId, envId, origin } = workerData;
	const client = new OrchestratorClient(origin);
	const stateService = new StateService();
	try {
		const metadata = await client.getEnvironmentMetadata(sesId, envId);
		stateService.session.sessionId = metadata.sessionId;
		stateService.session.environmentId = metadata.id;

		logger.info(`planning session '${envId}':'${sesId}' contents (suites/tests)...`);
		await planSession(metadata.testPaths, stateService, src => url.pathToFileURL(src).toString());

		const testExecutor = createNodeJSExecutor(metadata, stateService);
		await runSession(stateService, testExecutor);
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
					//	`run` comes across worker boundary as a plain object
					//	(see nodejs-test-box for the reason); rehydrate into
					//	TestRun so the #error setter accepts the payload
					stateService.updateRunEnded(suiteName, testName, rehydrateRun(run));
					await worker.terminate();
					worker.unref();
					resolve(void 0);
				}
			});
			worker.on('error', async error => {
				logger.error(`worker for test '${test.name}' errored: ${error}, stack: ${error.stack}`);
				const crashRun = new TestRun();
				crashRun.status = STATUS.ERROR;
				crashRun.error = error;
				stateService.updateRunEnded(suiteName, test.name, crashRun);
				await worker.terminate();
				worker.unref();
				resolve(void 0);
			});

			worker.postMessage({
				testName: test.name,
				suiteName,
				testSource: test.source,
				coverageEnabled: sessionMetadata.coverageEnabled,
				coverageInclude: sessionMetadata.coverageInclude
			});
		});
	};
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

//	TestError.fromError requires an Error instance, so repackage the
//	plain payload (from the test-box's toJSON) back into one; preserve
//	the original type by re-assigning `constructor.name`-equivalent
//	metadata onto the TestError fields via fromError's read path.
function rehydrateError(plain: any): TestError {
	const e: any = new Error(plain.message ?? '');
	e.name = plain.name ?? 'Error';
	e.stack = plain.stack ?? '';
	if (plain.cause) {
		e.cause = rehydrateError(plain.cause);
	}
	const te = TestError.fromError(e);
	//	fromError reads error.constructor.name for `type`; but the original
	//	type (AssertionError / TypeError / …) is what we actually want. The
	//	TestError has private fields so we can't patch it directly — build a
	//	fresh one with the right type.
	return new (TestError as any)(te.name, plain.type ?? te.type, te.message, te.stack, te.cause);
}