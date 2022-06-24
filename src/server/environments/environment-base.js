import { EventEmitter } from 'events';

export class EnvironmentBase extends EventEmitter {
	constructor(sessionId) {
		super();
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