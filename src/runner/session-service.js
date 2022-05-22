/**
 * Runs a session of all suites/tests
 */

export {
	runSession,
	runSuite,
}

async function runSession(stateService, testExecutor) {
	const started = globalThis.performance.now();

	const executionData = stateService.getExecutionData();
	console.info(`starting test session (${executionData.suites.length} suites)...`);
	const suitePromises = executionData.suites.map(suite => runSuite(suite, testExecutor));
	await Promise.all(suitePromises);
	const ended = globalThis.performance.now();
	console.info(`... session done (${(ended - started).toFixed(1)}ms)`);
}

async function runSuite(suite, testExecutor) {
	const testPromises = [];
	console.log(`suite '${suite.name}' started...`);

	let syncChain = Promise.resolve();
	suite.tests.forEach(test => {
		if (test.config.skip) {
			testPromises.push(Promise.resolve());
		} else {
			const runResultPromise = testExecutor(test);
			if (suite.config.sync) {
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
