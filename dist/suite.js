import { Test, STATUSES } from './test.js';

const
	DEFAULT_SUITE_OPTIONS = Object.freeze({
		name: 'nameless',
		sync: false,
		skip: false
	});

let
	suiteIDSequencer = 0;

export function Suite(options, jtModel) {
	const opts = Object.assign({}, DEFAULT_SUITE_OPTIONS, options);
	this.lastSyncTestPromise = Promise.resolve();

	this.id = suiteIDSequencer++;
	this.name = opts.name;

	this.passed = 0;
	this.failed = 0;
	this.skipped = 0;
	this.started = null;
	this.duration = null;

	this.runTest = function (testParams, testCode) {
		if (!testParams || typeof testParams !== 'object') {
			throw new Error('test parameters MUST be a non-null object; got ' + testParams);
		}
		if (typeof testCode !== 'function') {
			throw new Error('test code MUST be a function; got ' + testCode);
		}

		//	prepare test DTO
		//	run it immediatelly or queue to sync execution

		const test = new Test(testParams, testCode);
		if (test.sync) {
			this.lastSyncTestPromise = this.lastSyncTestPromise.finally(() => {
				return new Promise(resolve =>
					test.run()
						.finally(() => {
							switch (test.status) {
								case STATUSES.PASSED:
									this.passed++;
									jtModel.passed++;
									break;
								case STATUSES.FAILED:
									this.failed++;
									jtModel.failed++;
									break;
								case STATUSES.SKIPPED:
									this.skipped++;
									jtModel.skipped++;
									break;
								default:
									break;
							}
							this.duration = stringifyDuration(performance.now() - this.started);
							jtModel.done++;
							resolve();
						})
				);
			});
		} else {
			test.run()
				.finally(() => {
					switch (test.status) {
						case STATUSES.PASSED:
							this.passed++;
							jtModel.passed++;
							break;
						case STATUSES.FAILED:
							this.failed++;
							jtModel.failed++;
							break;
						case STATUSES.SKIPPED:
							this.skipped++;
							jtModel.skipped++;
							break;
						default:
							break;
					}
					this.duration = stringifyDuration(performance.now() - this.started);
					jtModel.done++;
				});
		}

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
