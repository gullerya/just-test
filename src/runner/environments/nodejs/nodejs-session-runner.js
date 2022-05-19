/**
 * NodeJS specific session runner
 * - obtains the environment configuration
 * - sets up object model in the NodeJS environment way
 */

import url from 'node:url';
import { workerData } from 'node:worker_threads';
import * as serverAPI from '../../server-api-service.js';
import SimpleStateService from '../../simple-state-service.js';
import { reportResults } from '../../report-service.js';
import { runSession } from '../../session-service.js';
import { installExecutionContext, EXECUTION_MODES } from '../../environment-config.js';

(async () => {
	let sesEnvResult;
	let envConfig;
	const stateService = new SimpleStateService();
	try {
		envConfig = workerData;

		//	obtain session metadata
		console.info(`fetching session metadata...`);
		const metadata = await serverAPI.getSessionMetadata(envConfig.sesId, envConfig.envId, envConfig.origin);
		stateService.setSessionId(metadata.sessionId);
		stateService.setEnvironmentId(metadata.id);

		console.info(`register session contents (suites/tests)...`);
		const execContext = installExecutionContext(EXECUTION_MODES.SESSION);
		await registerSessionContent(metadata.testPaths, stateService, execContext.parentPort);

		console.info(`executing session...`);
		await runSession(metadata, stateService);

		console.info(`collecting results...`);
		sesEnvResult = stateService.getAll();
	} catch (e) {
		console.error(e);
		console.error('session execution failed due to the previous error/s');
		//	TODO: the below one should probably be replaced with the error state
		sesEnvResult = stateService.getAll();
	} finally {
		await reportResults(envConfig.sesId, envConfig.envId, sesEnvResult);
	}
})();

/**
 * imports suites/tests metadata
 * - has a side effect of collecting suites/tests metadata in the state service
 * 
 * @param {string[]} testsResources - array of paths
 * @param {object} stateService - state service
 */
async function registerSessionContent(testsResources, stateService, ownPort) {
	const started = globalThis.performance.now();
	console.info(`fetching ${testsResources.length} test resource/s...`);

	ownPort.on('message', message => {
		console.log(message);
	});

	const testResourcePromises = [];
	for (const tr of testsResources) {
		try {
			await import(url.pathToFileURL(tr));
			//	the suite execution context should be sending the registration stugg
			//	the equivalent of below should happen during the import time of the test, via just-test import
			// _stateService.addTest(suiteName, testMeta.name, testId, testMeta.code, testMeta.config);
			stateService.getUnSourced().forEach(t => t.source = tr);
		} catch (e) {
			console.error(`failed to import '${tr}':`, e);
		}
	}
	await Promise.all(testResourcePromises);

	console.info(`... ${testsResources.length} test resource/s fetched (registration phase) ` +
		`in ${(globalThis.performance.now() - started).toFixed(1)}ms`);
}

//	TODO: this and below are registration methods
//	TODO: move them into suite-runner.js
//	TODO: on each failure here user should get a visual feedback
// function getSuite(suiteName, suiteConfig) {
// 	const suiteMeta = validateNormalizeSuiteParams(suiteName, suiteConfig);
// 	_stateService.obtainSuite(suiteMeta.name, suiteMeta.config);

// 	return {
// 		test: (testName, testCode, testConfig) => {
// 			try {
// 				const testMeta = validateNormalizeTestParams(testName, testCode, testConfig);
// 				const testId = getTestId(suiteName, testMeta.name);
// 				_stateService.addTest(suiteName, testMeta.name, testId, testMeta.code, testMeta.config);
// 			} catch (e) {
// 				console.error(`failed to register test '${testName} : ${JSON.stringify(testConfig)}':`, e);
// 			}
// 		}
// 	}
// }