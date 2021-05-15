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
		this.environments = {};
	}

	async addSession(sessionConfig) {
		const effectiveConfig = buildConfig(sessionConfig);

		logger.info(effectiveConfig);

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
		await this.runSession(sessionId);
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
		const environments = await getEnvironmentsService().launch(session);
		this.environments[sessionId] = environments;
		logger.info(`... session '${sessionId}' started, waiting finalization...`);
	}

	async storeResult(sesId, envId, sesResult) {
		const session = await this.getSession(sesId);
		if (!session) {
			throw new Error(`session ID '${sesId}' not exists`);
		}
		session.result = sesResult;
		logger.info(`environment '${envId}' reported results, dismissing...`);
		const env = this.environments[sesId].find(e => e.envConfig.id === envId);
		if (env) {
			await env.dismiss();
			this.environments[sesId].splice(this.environments[sesId].indexOf(env), 1);
			logger.info(`... environment '${envId}' dismissed`);
		} else {
			logger.warn(`... environment '${envId}' was not found`);
		}
	}
}

function getSessionsService() {
	if (!sessionsServiceInstance) {
		sessionsServiceInstance = new SessionsService();
	}
	return sessionsServiceInstance;
}