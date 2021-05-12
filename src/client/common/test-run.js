export class TestRun {
	constructor() {
		this.assertions = 0;
		this.time = null;
		this.status = null;
		this.error = null;
		Object.seal(this);
	}
}