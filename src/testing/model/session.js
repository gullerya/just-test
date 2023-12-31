export class Session {
	constructor() {
		this.sessionId = null;
		this.environmentId = null;
		this.timestamp = null;
		this.time = null;
		this.suites = [];
		this.errors = [];
		this.coverage = null;

		this.total = 0;
		this.done = 0;
		this.skip = 0;
		this.pass = 0;
		this.fail = 0;
		this.error = 0;

		Object.seal(this);
	}
}