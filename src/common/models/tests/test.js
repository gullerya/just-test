export class Test {
	constructor() {
		this.id = null;
		this.name = 'Unspecified';
		this.source = null;
		this.options = {};
		this.lastRun = null;
		this.runs = [];
		Object.seal(this);
	}
}