export class TestRun {
	constructor() {
		this.timestamp = null;
		this.time = null;
		this.assertions = 0;
		this.status = null;
		this.error = null;
		this.coverage = null;
		Object.seal(this);
	}
}