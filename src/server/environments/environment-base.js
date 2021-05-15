export class EnvironmentBase {
	constructor(sessionId) {
		if (!sessionId || typeof sessionId !== 'string') {
			throw new Error(`invalid session ID '${sessionId}'`);
		}
		this.sessionId = sessionId;
	}

	async launch() {
		throw new Error('not implemented');
	}

	async dismiss() {
		throw new Error('not implemented');
	}
}