import { Test } from './test.js';

const
	DEFAULT_SUITE_OPTIONS = Object.freeze({
		name: 'nameless'
	});

let
	suiteIDSequencer = 0;

export function Suite(options, jtModel) {
	const opts = Object.assign({}, DEFAULT_SUITE_OPTIONS, options);

	this.id = suiteIDSequencer++;
	this.name = opts.name;
	this.tests = [];

	this.status = 'idle';
	this.passed = 0;
	this.failed = 0;
	this.skipped = 0;
	this.started = null;
	this.duration = null;

	this.runTest = function (testParams, testCode) {
		if (!testParams || (typeof testParams !== 'string' && typeof testParams !== 'object')) {
			throw new Error('test parameters MUST be a non empty string or an object; got ' + testParams);
		}
		if (typeof testCode !== 'function') {
			throw new Error('test code MUST be a function; got ' + testCode);
		}

		const test = new Test(testParams, testCode);
		this.tests.push(test);
		test.whenDone
			.finally(() => {
				switch (test.status) {
					case 'pass':
						this.passed++;
						jtModel.passed++;
						break;
					case 'fail':
						this.failed++;
						jtModel.failed++;
						break;
					case 'skip':
						this.skipped++;
						jtModel.skipped++;
						break;
					default:
						break;
				}
				this.duration = stringifyDuration(performance.now() - this.started);
				jtModel.done++;
			});

		if (!this.started) {
			this.started = performance.now();
		}

		jtModel.total++;
	};
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
