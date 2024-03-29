/**
 * Sessions service is responsible for
 * - managing sessions set
 * - creating new session with validated configuration
 * - providing session data upon demand
 */
import Logger from '../logger/logger.js';
import { getRandom } from '../../common/random-utils.js';
import buildConfig from './sessions-configurer.js';
import { launch, dismiss } from '../environments/environments-service.js';

export {
	addSession,
	storeResult,
	getAll,
	getSession
};

const logger = new Logger({ context: 'sessions' });
const sessions = {};

async function addSession(sessionConfig) {
	const effectiveConfig = buildConfig(sessionConfig);

	logger.info('session effective config', effectiveConfig);

	let sessionId = getRandom(8);
	if (sessionId in sessions) {
		throw new Error(`session ID collision on '${sessionId}'`);
	}
	sessions[sessionId] = Object.seal({
		id: sessionId,
		config: effectiveConfig,
		result: null
	});
	logger.info(`session created; id '${sessionId}'`);

	//	TODO: consider auto-run behaviour to be managed elsewhere
	await runSession(sessionId);
	return sessionId;
}

async function getSession(sessionId) {
	if (!sessionId || typeof sessionId !== 'string') {
		throw new Error(`invalid session ID '${sessionId}'`);
	}
	return sessions[sessionId] || null;
}

async function getAll() {
	return sessions;
}

async function runSession(sessionId) {
	const session = sessions[sessionId];
	if (!session) {
		throw new Error(`session with ID '${sessionId}' not exists`);
	}

	logger.info(`starting session '${sessionId}'...`);
	const sesEnvs = await launch(session);
	for (const sesEnv of sesEnvs) {
		sesEnv.addEventListener('dismissed', () => {
			sesEnvs.splice(sesEnvs.indexOf(sesEnv), 1);
			if (!sesEnvs.length) {
				logger.info(`all environments of session ${sessionId} are closed, finalizing session`);
				finalizeSession(sessionId);
			}
		});
	}
	logger.info(`... session '${sessionId}' started, waiting finalization...`);
}

async function storeResult(sesId, envId, envResult) {
	const session = await getSession(sesId);
	if (!session) {
		throw new Error(`session ID '${sesId}' not exists`);
	}

	session.result = envResult;
	logger.info(`environment '${envId}' reported results for session '${sesId}'`);

	// if (artifacts) {
	// 	if (artifacts.coverage) {
	// 		for (const [testId, coverage] of Object.entries(artifacts.coverage)) {
	// 			const [sid] = parseTestId(testId);
	// 			const suite = envResult.suites.find(s => s.id === sid);
	// 			const test = suite.tests.find(t => t.id === testId);
	// 			test.lastRun.coverage = coverage;

	// 			logger.info(coverage);
	// 		}
	// 	}
	// 	if (artifacts.logs) {
	// 		//	TBD
	// 	}
	// }

	//	we'll not wait for dismissal
	dismiss(envId);
}

async function finalizeSession(sessionId) {
	const session = await getSession(sessionId);
	if (!session) {
		throw new Error(`session with ID '${sessionId}' not exists`);
	}

	//	TODO: calculate session status/result from the envs, or error
	if (session.result) {
		return;
	} else {
		session.result = 'failure';
	}
}