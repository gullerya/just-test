/**
 * Runs a session of all suites/tests
 */

import { STATUS } from '../common/constants.ts';
import { Session } from '../testing/model/session.ts';
import { Suite } from '../testing/model/suite.ts';

export {
	runSession,
	runSuite,
	isSettled
};

//	A test is "settled" when its outcome is already decided before the
//	executor runs — skip at registration, duplicate-name rejection, and
//	(future) planning-time validation errors all land here. Generic gate:
//	anything the runner knows the result of should not be dispatched.
const TERMINAL_STATUSES = new Set([STATUS.SKIP, STATUS.PASS, STATUS.FAIL, STATUS.ERROR]);

function isSettled(test): boolean {
	return !!test.lastRun && TERMINAL_STATUSES.has(test.lastRun.status);
}

async function runSession(stateService, testExecutor) {
	const started = globalThis.performance.now();

	const executionData: Session = stateService.getExecutionData();
	console.info(`starting test session (${executionData.suites.length} suites)...`);
	executionData.timestamp = Date.now();
	const suitePromises = executionData.suites.map(suite => runSuite(suite, testExecutor));
	await Promise.all(suitePromises);
	executionData.time = Date.now() - executionData.timestamp;

	console.info(`... session done (${(globalThis.performance.now() - started).toFixed(1)}ms)`);
}

async function runSuite(suite: Suite, testExecutor) {
	const testPromises = [];
	console.log(`suite '${suite.name}' started...`);

	let syncChain = Promise.resolve();
	suite.tests.forEach(test => {
		if (isSettled(test)) {
			testPromises.push(Promise.resolve());
		} else {
			const runResultPromise = testExecutor(test, suite.name);
			if ((suite.config as any).sync) {
				syncChain = syncChain.finally(() => runResultPromise);
			} else {
				testPromises.push(runResultPromise);
			}
		}
	});

	testPromises.push(syncChain);
	await Promise.all(testPromises);
	console.log(`... suite '${suite.name}' done`);
}
