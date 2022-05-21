import url from 'node:url';
import { workerData, parentPort } from 'node:worker_threads';
import { EXECUTION_MODES, installExecutionContext } from '../../environment-config.js';

let envConfig;
try {
	envConfig = workerData;

	const execContext = installExecutionContext(EXECUTION_MODES.TEST, null, parentPort, envConfig.testId);

	import(url.pathToFileURL(envConfig.testSource));
} catch (e) {
	console.error(e);
} finally {
}