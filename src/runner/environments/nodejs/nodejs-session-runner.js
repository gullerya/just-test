/**
 * NodeJS specific session runner
 * - obtains the environment configuration
 * - sets up object model in the NodeJS environment way
 */

import { workerData } from 'node:worker_threads';
import { loadMetadata, execute } from './main-nodejs.js';
import SimpleStateService from '../../simple-state-service.js';
import { reportResults } from '../../report-service.js';

(async () => {
	let sesEnvResult;
	let envConfig;
	const stateService = new SimpleStateService();
	try {
		envConfig = workerData;
		const metadata = await loadMetadata(envConfig.sesId, envConfig.envId);
		await execute(metadata, stateService);
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