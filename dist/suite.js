import { Test, stringifyDuration } from './test.js';

let
	suiteIDSequencer = 0;

export function Suite(options) {
	this.id = suiteIDSequencer++;
	this.name = options.name || 'nameless';
	this.tests = [];

	this.status = 'idle';
	this.passed = 0;
	this.failed = 0;
	this.skipped = 0;

	this.addTest = function (options, testCode) {
		this.tests.push(new Test(options, testCode));
	};

	this.run = async function () {
		this.start = performance.now();
		this.status = 'running';
		this.passed = 0;
		this.failed = 0;
		this.skipped = 0;
		this.duration = 0;

		const testPromises = [];
		this.tests.forEach(test => {
			if (!test.skip) {
				testPromises.push(new Promise(resolve =>
					test.run()
						.then(() => { this.passed++; resolve(); })
						.catch(() => { this.failed++; resolve(); }))
				);
			} else {
				this.skipped++;
			}
		});

		const suitePromise = Promise.all(testPromises);
		suitePromise.then(() => document.dispatchEvent(new CustomEvent('justTestSuiteFinished', { detail: this })));
	}
}

Suite.prototype.finalize = function () {
	this.end = performance.now();
	this.status = this.failed > 0 ? 'failed' : 'passed';
	this.duration = stringifyDuration(this.end - this.start);
};
