export class Test {
	constructor(meta, frame) {
		Object.assign(this, meta);
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