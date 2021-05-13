import { runTest } from './test-runner.js';

export class TestRun {
	constructor() {
		this.assertions = 0;
		this.time = null;
		this.status = null;
		this.error = null;
		Object.seal(this);
	}
}

export class TestRunBox {
	constructor(test) {
		this.test = test;
		this.runTest = runTest;

		this.started = new Promise(r => {
			this.resolveStarted = r;
		});
		this.ended = new Promise(r => {
			this.resolveEnded = r;
		});
	}
}