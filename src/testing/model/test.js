export class Test {
	constructor(id = null, name = 'Undefined', suiteName = 'Undefined', config = {}, source = null) {
		this.id = id;
		this.name = name;
		this.suiteName = suiteName;
		this.config = config;
		this.source = source;

		this.lastRun = null;
		this.runs = [];
		Object.seal(this);
	}
}