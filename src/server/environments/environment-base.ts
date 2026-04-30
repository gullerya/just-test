export class EnvironmentBase extends EventTarget {
	#sessionId: string;

	constructor(sessionId) {
		super();
		if (!sessionId || typeof sessionId !== 'string') {
			throw new Error(`invalid session ID '${sessionId}'`);
		}
		this.#sessionId = sessionId;
	}

	get sessionId() { return this.#sessionId; }

	async launch() {
		throw new Error('not implemented');
	}

	async dismiss() {
		throw new Error('not implemented');
	}
}