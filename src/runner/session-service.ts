/**
 * Runs a session of all suites/tests
 */

import { Session } from '../testing/model/session.ts';
import { Suite } from '../testing/model/suite.ts';

export {
	runSession,
	runSuite,
};

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
		if (test.config.skip) {
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
