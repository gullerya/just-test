/**
 * Browser specific SESSION runner
 * - runs as part of automation or interactive
 * - interacts with the JustTest server over the standard REST APIs
 * - manages tests execution: frames/workers, lifecycle reporting
 */

import * as serverAPI from '../../server-api-service.js';
import SimpleStateService from '../../simple-state-service.js';
import { runSession } from '../../session-service.js';
import { ENVIRONMENT_KEYS, EXECUTION_MODES, setExecutionContext } from '../../environment-config.js';

const { sesId, envId, serverOrigin } = await getEnvironmentConfig();
try {
	const stateService = new SimpleStateService();
	const metadata = await serverAPI.getSessionMetadata(sesId, envId, serverOrigin);
	stateService.setSessionId(metadata.sessionId);
	stateService.setEnvironmentId(metadata.id);

	console.info(`planning session contents (suites/tests)...`);
	await planSession(metadata.testPaths, stateService);

	console.info(`running session ...`);
	await runSession(metadata, stateService);

	console.info(`reporting session ...`);
	const sesEnvResult = stateService.getAll();
	await serverAPI.reportSessionResult(sesId, envId, serverOrigin, sesEnvResult);
} catch (e) {
	console.error(e);
	console.error('session execution failed due to the previous error/s');
	await serverAPI.reportSessionResult(sesId, envId, serverOrigin, {
		error: e
	});
}

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

async function planSession(testsResources, stateService) {
	const started = globalThis.performance.now();

	console.info(`fetching ${testsResources.length} test resource/s...`);
	for (const tr of testsResources) {
		try {
			const execContext = setExecutionContext(EXECUTION_MODES.PLAN);
			execContext.suiteName = tr;
			await import(`/tests/${tr}`);
			for (const { name, config } of execContext.testConfigs) {
				stateService.addTest({
					name,
					config,
					source: tr,
					suiteName: execContext.suiteName,
					runs: []
				});
			}
		} catch (e) {
			console.error(`failed to process '${tr}':`);
			console.error(e);
		}
	}

	const ended = globalThis.performance.now();
	console.info(`... ${testsResources.length} test resource/s fetched (planning phase) in ${(ended - started).toFixed(1)}ms`);
}
