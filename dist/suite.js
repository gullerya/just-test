import { Test } from './test.js';

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
		this.status = 'runs';
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
		suitePromise.then(() => {
			this.end = performance.now();
			this.duration = stringifyDuration(this.end - this.start);
			document.dispatchEvent(new CustomEvent('justTestSuiteFinished', { detail: this }))
		});

		return suitePromise;
	}
}

function stringifyDuration(duration) {
	let ds = '';
	if (typeof duration === 'number') {
		if (duration > 99) ds = (duration / 1000).toFixed(1) + ' s' + String.fromCharCode(160);
		else if (duration > 59900) ds = (duration / 60000).toFixed(1) + ' m' + String.fromCharCode(160);
		else ds = duration.toFixed(1) + ' ms';
	}
	return ds;
}
