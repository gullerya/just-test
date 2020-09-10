export class Test {
	constructor(name, frame) {
		this.name = name;
		this.frame = frame;
		this.runs = [];
		Object.seal(this);
	}
}

export class Run {
	constructor() {
		this.asserts = null;
		this.duration = null;
		this.error = null;
		this.result = null;
		Object.seal(this);
	}
}