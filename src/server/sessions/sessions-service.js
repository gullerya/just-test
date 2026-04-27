/**
 * Sessions service is responsible for
 * - managing sessions set
 * - creating new session with validated configuration
 * - providing session data upon demand
 */
import Logger from '../logger/logger.js';
import { getRandom } from '../../common/random-utils.js';
import { getTestId } from '../../common/interop-utils.js';
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
		result: null,
		//	`resultReady` flips to true only after storeResult finishes attaching
		//	side-channel artifacts (coverage). the result endpoint must hide the
		//	result until then, otherwise callers poll and resolve too early
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

	//	dismiss the environment, then merge any side-channel artifacts
	//	(e.g. per-test coverage collected by Playwright) back into envResult
	const artifacts = await dismiss(envId);
	if (artifacts?.coverage) {
		attachCoverageArtifacts(envResult, artifacts.coverage);
	}
	//	mark result as fully assembled so the /result endpoint may publish it
	session.resultReady = true;
}

//	coverage artifacts arrive keyed by `getTestId(suite, test)` for per-test
//	coverage, and by the sentinel `__session__` for session-global coverage
//	(main page / iframe / worker hosts where 1:1 test-to-page mapping does
//	not exist). per-test values land on `test.lastRun.coverage`; the session
//	value lands on `envResult.coverage` and is consumed by the reporter.
const SESSION_COVERAGE_ID = '__session__';

function attachCoverageArtifacts(envResult, coverageByTestId) {
	if (!envResult || !Array.isArray(envResult.suites)) {
		return;
	}
	const testsById = new Map();
	for (const suite of envResult.suites) {
		for (const t of suite.tests ?? []) {
			testsById.set(getTestId(suite.name, t.name), t);
		}
	}
	for (const [testId, coverage] of coverageByTestId instanceof Map
		? coverageByTestId.entries()
		: Object.entries(coverageByTestId)) {
		if (testId === SESSION_COVERAGE_ID) {
			envResult.coverage = coverage;
			continue;
		}
		const t = testsById.get(testId);
		if (!t) {
			logger.warn(`coverage artifact for unknown test '${testId}', dropping`);
			continue;
		}
		if (!t.lastRun) {
			logger.warn(`test '${testId}' has no lastRun, cannot attach coverage`);
			continue;
		}
		t.lastRun.coverage = coverage;
	}
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