/**
 * Sessions service is responsible for
 * - managing sessions set
 * - creating new session with validated configuration
 * - providing session data upon demand
 */
import Logger from '../logger/logger.js';
import { getRandom } from '../server-utils.js';
import buildConfig from './sessions-configurer.js';
import { getEnvironmentsService } from '../environments/environments-service.js';

export {
	getSessionsService
}

const
	logger = new Logger({ context: 'sessions' });

let sessionsServiceInstance;

class SessionsService {
	constructor() {
		this.sessions = {};
	}

	async addSession(sessionConfig) {
		const effectiveConfig = buildConfig(sessionConfig);

		console.log(effectiveConfig);

		let sessionId = getRandom(8);
		while (sessionId in this.sessions) {
			logger.error(`session ID collision (${sessionId})`);
			sessionId = getRandom(8);
		}
		this.sessions[sessionId] = {
			id: sessionId,
			config: effectiveConfig,
			status: null,
			result: null
		};
		logger.info(`session created; id '${sessionId}'`);

		//	TODO: consider this auto-run behaviour to be managed elsewhere
		this.runSession(sessionId);
		return sessionId;
	}

	async getSession(sessionId) {
		if (!sessionId || typeof sessionId !== 'string') {
			throw new Error(`invalid session ID '${sessionId}'`);
		}
		return this.sessions[sessionId] || null;
	}

	async getAll() {
		return this.sessions;
	}

	async runSession(sessionId) {
		const session = this.sessions[sessionId];
		if (!session) {
			throw new Error(`session ID '${sessionId}' not exists`);
		}

		logger.info(`starting session '${sessionId}'...`);
		await getEnvironmentsService().launch(session.config.environments);
		logger.info(`... session '${sessionId}' done recording results`);
		//	TODO: put the results to each of the sessions per environment
		//	TODO: create reports where applicable
	}
}

function getSessionsService() {
	if (!sessionsServiceInstance) {
		sessionsServiceInstance = new SessionsService();
	}
	return sessionsServiceInstance;
}