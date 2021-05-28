import { runTest } from './test-runner.js';

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

		Object.seal(this);
	}
}