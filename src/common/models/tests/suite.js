export class Suite {
	constructor() {
		this.id = null;
		this.name = 'Unspecified';
		this.options = null;
		this.timestamp = null;
		this.time = null;
		this.tests = [];

		this.total = 0;
		this.done = 0;
		this.skip = 0;
		this.pass = 0;
		this.fail = 0;
		this.error = 0;
		
		Object.seal(this);
	}
}