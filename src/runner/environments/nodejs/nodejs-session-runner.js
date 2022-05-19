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
		await registerSession(metadata.testPaths, stateService, execContext.parentPort);

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
async function registerSession(testsResources, stateService, ownPort) {
	const started = globalThis.performance.now();
	console.info(`fetching ${testsResources.length} test resource/s...`);
	let reported = 0;

	const registrationPromise = new Promise(resolve => {
		ownPort.on('message', testConfigs => {
			console.info(`received ${testConfigs.length} test configs`);
			for (const tc of testConfigs) {
				stateService.addTest(tc.suiteName, tc.testName, tc.id, null, tc.config);
			}
			reported++;

			if (reported === testsResources.length) {
				resolve();
			}
		});
	});

	for (const tr of testsResources) {
		try {
			import(url.pathToFileURL(tr));
			stateService.getUnSourced().forEach(t => t.source = tr);
		} catch (e) {
			console.error(`failed to import '${tr}':`, e);
		}
	}

	console.info(`... ${testsResources.length} test resource/s fetched (registration phase) ` +
		`in ${(globalThis.performance.now() - started).toFixed(1)}ms`);

	return registrationPromise;
}

async function runSessionA() {
	//	get the test config collection / suites
	//	for each suite check the only/skip
	//	each suite that can be run:
	//	-	for each test check only/skip
	//	-	each test that can be run:
	//		- create new worker, import the source with the relevant test id and config
	//	wait for all of the tests to report results
	//	report to server API
}