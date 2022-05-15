/**
 * NodeJS specific session runner
 * - obtains the environment configuration
 * - sets up object model in the NodeJS environment way
 */

import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { workerData } from 'node:worker_threads';
import * as serverAPI from '../../server-api-service.js';
import SimpleStateService from '../../simple-state-service.js';
import { reportResults } from '../../report-service.js';
import { runSession } from '../../session-service.js';
import { ExecutionContext, EXECUTION_MODES } from '../../environment-config.js';

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

		console.info(`collecting suites data...`);
		const execContext = new ExecutionContext(EXECUTION_MODES.SESSION);
		ExecutionContext.install(execContext);
		await collectTests(metadata.testPaths, stateService);

		console.info(`executing suites...`);
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

//	TODO: on each failure here user should get a visual feedback
/**
 * imports suites/tests metadata
 * - has a side effect of collecting suites/tests metadata in the state service
 * 
 * @param {string[]} testsResources - array of paths
 * @param {object} stateService - state service
 */
async function collectTests(testsResources, stateService) {
	const started = globalThis.performance.now();
	console.info(`fetching ${testsResources.length} test resource/s...`);

	for await (const tr of testsResources) {
		try {
			const rPath = pathToFileURL(path.resolve(tr));
			await import(rPath);
			stateService.getUnSourced().forEach(t => t.source = tr);
		} catch (e) {
			console.error(`failed to import '${tr}':`, e);
		}
	}

	console.info(`... test resources fetched (${(globalThis.performance.now() - started).toFixed(1)}ms)`);
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