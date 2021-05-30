/**
 * Sessions service is responsible for
 * - managing sessions set
 * - creating new session with validated configuration
 * - providing session data upon demand
 */
import Logger from '../logger/logger.js';
import { parseTestId } from '../../common/interop-utils.js';
import { getRandom } from '../../common/random-utils.js';
import buildConfig from './sessions-configurer.js';
import { launch, dismiss } from '../environments/environments-service.js';

export {
	addSession,
	storeResult,
	getAll,
	getSession
}

const logger = new Logger({ context: 'sessions' });
const sessions = {};

async function addSession(sessionConfig) {
	const effectiveConfig = buildConfig(sessionConfig);

	logger.info(effectiveConfig);

	let sessionId = getRandom(8);
	while (sessionId in sessions) {
		logger.error(`session ID collision (${sessionId})`);
		sessionId = getRandom(8);
	}
	sessions[sessionId] = {
		id: sessionId,
		config: effectiveConfig,
		status: null,
		result: null
	};
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
		throw new Error(`session ID '${sessionId}' not exists`);
	}

	logger.info(`starting session '${sessionId}'...`);
	const sesEnvs = await launch(session);
	for (const sesEnv of sesEnvs) {
		sesEnv.on('dismissed', event => {
			//	TODO: handle here the abnormal session finalization
			console.log(event);
		});
	}
	logger.info(`... session '${sessionId}' started, waiting finalization...`);
}

async function storeResult(sesId, envId, sesResult) {
	const session = await getSession(sesId);
	if (!session) {
		throw new Error(`session ID '${sesId}' not exists`);
	}

	//	enrich with artifacts
	const artifacts = await dismiss(envId);
	if (artifacts.coverage) {
		for (const [testId, coverage] of Object.entries(artifacts.coverage)) {
			const [sid] = parseTestId(testId);
			const suite = sesResult.suites.find(s => s.id === sid);
			const test = suite.tests.find(t => t.id === testId);
			test.lastRun.coverage = coverage;
		}
	}
	if (artifacts.logs) {
		//	TBD
	}

	session.result = sesResult;
	logger.info(`environment '${envId}' reported results for session '${sesId}'`);
}