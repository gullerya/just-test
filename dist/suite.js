import { Test, STATUSES } from './test.js';

const
	DEFAULT_SUITE_OPTIONS = Object.freeze({
		sync: false,
		skip: false
	}),
	FINALIZE_SUITE_KEY = Symbol('finalize.suite.key');

export class Suite extends EventTarget {
	constructor(options) {
		super();
		if (!options || typeof options !== 'object') {
			throw new Error('options MUST be a non-null object');
		}
		if (!options.name || typeof options.name !== 'string') {
			throw new Error('name MUST be a non empty string within the options');
		}

		Object.assign(this, DEFAULT_SUITE_OPTIONS, options);
		this.tests = [];
		this.start = null;
		this.duration = null;
		this.syncTail = Promise.resolve();
		this.allDone = new Promise(resolve => { this.resolve = resolve });
		Object.seal(this);
	}

	async runTest(testParams, testCode) {
		if (this.skip) {
			return;
		}

		if (!this.start) {
			this.start = performance.now();
		}

		try {
			const test = new Test(testParams, testCode);
			this.tests.push(test);
			if (test.sync) {
				this.syncTail = this.syncTail.then(test.run);
				this.syncTail.then(() => this[FINALIZE_SUITE_KEY](test.name));
			} else {
				await test.run();
				this[FINALIZE_SUITE_KEY](test.name);
			}
		} catch (e) {
			console.error('failed to run test', e);
		}

		// if (test.sync) {
		// 	this.lastSyncTestPromise = this.lastSyncTestPromise.finally(() => {
		// 		return new Promise(resolve =>
		// 			test.run()
		// 				.finally(() => {
		// 					switch (test.status) {
		// 						case STATUSES.PASSED:
		// 							this.passed++;
		// 							jtModel.passed++;
		// 							break;
		// 						case STATUSES.FAILED:
		// 							this.failed++;
		// 							jtModel.failed++;
		// 							break;
		// 						case STATUSES.SKIPPED:
		// 							this.skipped++;
		// 							jtModel.skipped++;
		// 							break;
		// 						default:
		// 							break;
		// 					}
		// 					this.duration = stringifyDuration(performance.now() - this.started);
		// 					jtModel.done++;
		// 					resolve();
		// 				})
		// 		);
		// 	});
		// } else {
		// 	test.run()
		// 		.finally(() => {
		// 			switch (test.status) {
		// 				case STATUSES.PASSED:
		// 					this.passed++;
		// 					jtModel.passed++;
		// 					break;
		// 				case STATUSES.FAILED:
		// 					this.failed++;
		// 					jtModel.failed++;
		// 					break;
		// 				case STATUSES.SKIPPED:
		// 					this.skipped++;
		// 					jtModel.skipped++;
		// 					break;
		// 				default:
		// 					break;
		// 			}
		// 			this.duration = stringifyDuration(performance.now() - this.started);
		// 			jtModel.done++;
		// 		});
		// }

		// jtModel.total++;
	}

	get counters() {
		const r = {};
		this.tests.forEach(t => {
			t.status in r ? r[t.status]++ : r[t.status] = 1;
		});
		return r;
	}

	[FINALIZE_SUITE_KEY](testName) {
		this.dispatchEvent(new CustomEvent('testFinished', { detail: { testName: testName } }));
		setTimeout(() => {
			if (this.tests.every(t => t.status > STATUSES.RUNNING)) {
				this.duration = performance.now() - this.start;
				this.resolve();
			}
		}, 100);
	}
}

// function stringifyDuration(duration) {
// 	let ds = '';
// 	if (typeof duration === 'number') {
// 		if (duration > 99) ds = (duration / 1000).toFixed(1) + ' s' + String.fromCharCode(160);
// 		else if (duration > 59900) ds = (duration / 60000).toFixed(1) + ' m' + String.fromCharCode(160);
// 		else ds = duration.toFixed(1) + ' ms';
// 	}
// 	return ds;
// }
