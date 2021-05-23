import { runTest } from './test-runner.js';

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

export class TestRunBox {
	constructor(test, coverage = false) {
		this.test = test;

		this.runTest = runTest;

		this.started = new Promise(r => {
			this.resolveStarted = r;
		});
		this.ended = new Promise(r => {
			this.resolveEnded = r;
		});
		if (coverage) {
			this.coveragePromise = new Promise(r => {
				this.resolveCoverage = r;
			});
		}
		Object.seal(this);
	}
}