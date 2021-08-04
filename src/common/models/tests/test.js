export class Test {
	constructor() {
		this.id = null;
		this.name = 'Unspecified';
		this.source = null;
		this.config = {};
		this.lastRun = null;
		this.runs = [];
		Object.seal(this);
	}
}