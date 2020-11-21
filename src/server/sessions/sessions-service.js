/**
 * Sessions service is responsible for
 * - managing sessions set
 * - creating new session with validated configuration
 * - providing session data upon demand
 */
import Logger from '../logger/logger.js';
import { getRandom } from '../server-utils.js';
import { getEnvironmentsService } from '../environments/environments-service.js';
import { getTestingService } from '../testing/testing-service.js';
import { getCoverageService } from '../coverage/coverage-service.js';

export {
	getSessionsService
}

const
	logger = new Logger({ context: 'sessions' });

let sessionsServiceInstance;

class SessionsService {
	constructor() {
		this.environmentsService = getEnvironmentsService();
		this.testingService = getTestingService();
		this.coverageService = getCoverageService();
		this.sessions = {};
	}

	async addSession(configuration) {
		configuration.environments = this.environmentsService.verifyEnrichConfig(configuration.environments);
		configuration.tests = this.testingService.verifyEnrichConfig(configuration.tests);
		configuration.coverage = this.coverageService.verifyEnrichConfig(configuration.coverage);

		console.log(configuration);

		const sessionId = getRandom(16);
		this.sessions[sessionId] = {
			id: sessionId,
			config: configuration,
			status: null,
			result: null
		};
		logger.info(`session created; id '${sessionId}'`);
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
}

function getSessionsService() {
	if (!sessionsServiceInstance) {
		sessionsServiceInstance = new SessionsService();
	}
	return sessionsServiceInstance;
}