/**
 * Sessions service is responsible for
 * - managing sessions set
 * - creating new session with validated configuration
 * - providing session data upon demand
 */
import Logger from '../../logging/logger.ts';
import { getRandom } from '../../common/random-utils.ts';
import buildConfig from './sessions-configurer.ts';
import { launch, dismiss } from '../environments/environments-service.ts';
import { Session } from '../../testing/model/session.ts';

export {
	addSession,
	storeResult,
	getAll,
	getSession
};

type SessionEntry = {
	id: string;
	config: any;
	result: any;
	resultReady: boolean;
};

const logger = new Logger({ context: 'sessions' });
const sessions: Record<string, SessionEntry> = {};

async function addSession(sessionConfig): Promise<string> {
	const effectiveConfig = buildConfig(sessionConfig);

	logger.info('session effective config', effectiveConfig);

	const sessionId = getRandom(8);
	if (sessionId in sessions) {
		throw new Error(`session ID collision on '${sessionId}'`);
	}
	sessions[sessionId] = Object.seal({
		id: sessionId,
		config: effectiveConfig,
		result: null,
		//	`resultReady` flips to true only after the environment is fully
		//	dismissed. the /result endpoint hides the result until then so
		//	polling callers cannot race an in-flight teardown
		resultReady: false
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

async function getAll(): Promise<typeof sessions> {
	return sessions;
}

async function runSession(sessionId: string): Promise<void> {
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
				logger.info(`all environments of session '${sessionId}' are closed, finalizing session`);
				finalizeSession(sessionId).catch(err =>
					logger.error(`finalizeSession failed for session '${sessionId}':`, err)
				);
			}
		});
	}
	logger.info(`... session '${sessionId}' started, waiting finalization...`);
}

async function storeResult(sesId: string, envId: string, envResult: any): Promise<void> {
	const session = await getSession(sesId);
	if (!session) {
		throw new Error(`session ID '${sesId}' not exists`);
	}

	session.result = envResult;
	logger.info(`environment '${envId}' reported results for session '${sesId}'`);

	//	the sandbox already attached per-test coverage to each test.lastRun
	//	via the exposeBinding start/stop bracket, so no side-channel merge
	//	is needed here. dismiss the environment and publish the result.
	await dismiss(envId);
	session.resultReady = true;
}

async function finalizeSession(sessionId: string): Promise<void> {
	const session = await getSession(sessionId);
	if (!session) {
		throw new Error(`session with ID '${sessionId}' not exists`);
	}

	//	TODO: calculate session status/result from the envs, or error
	if (session.result) {
		return;
	}

	//	no env ever posted a result (env crashed / dismissed before reporting).
	//	publish a Session-shape failure so /result responds and local-runner's
	//	`sessionResult.summary.success` path doesn't explode
	const failure = new Session();
	failure.sessionId = sessionId;
	failure.errors.push(Object.assign(
		new Error(`session '${sessionId}' finalized with no environment result`),
		{ type: 'session-finalize' }
	));
	session.result = failure;
	session.resultReady = true;
}
