/**
 * Sessions service is responsible for
 * - managing sessions set
 * - creating new session with validated configuration
 * - providing session data upon demand
 */
import Logger from '../logger/logger.js';
import { getRandom } from '../server-utils.js';

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

	async addSession(configuration) {
		const sessionId = getRandom(8);
		this.sessions[sessionId] = configuration;
		logger.info(`session created; id '${sessionId}'`);
		return sessionId;
	}

	async getSession(sessionId) {
		if (!sessionId || typeof sessionId !== 'string') {
			throw new Error(`invalid session ID '${sessionId}'`);
		}
		return this.sessions[sessionId] || null;
	}
}

function getSessionsService() {
	if (!sessionsServiceInstance) {
		sessionsServiceInstance = new SessionsService();
	}
	return sessionsServiceInstance;
}