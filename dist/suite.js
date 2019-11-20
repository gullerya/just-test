import { Test, STATUSES } from './test.js';

const
	DEFAULT_SUITE_OPTIONS = Object.freeze({
		sync: false,
		skip: false
	}),
	FINISHED_RESOLVE_KEY = Symbol('finished.resolve.key'),
	FINALIZE_SUITE_KEY = Symbol('finalize.suite.key');

let suiteIdSource = 0;

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
		this.id = suiteIdSource++;
		this.tests = [];
		this.start = null;
		this.duration = null;
		this.syncTail = Promise.resolve();
		this.finished = new Promise(resolve => { this[FINISHED_RESOLVE_KEY] = resolve });
		Object.seal(this);
	}

	async runTest(testParams, testCode) {
		if (this.skip) {
			return;
		}

		if (!this.start) {
			this.start = performance.now();
		}

		const test = new Test(testParams, testCode);
		try {
			this.tests.push(test);
			this.dispatchEvent(new CustomEvent('testAdded', { detail: { suiteId: this.id, test: test } }));
			if (test.sync) {
				this.syncTail = this.syncTail.then(test.run);
				this.syncTail.then(() => this[FINALIZE_SUITE_KEY](test));
			} else {
				await test.run();
				this[FINALIZE_SUITE_KEY](test);
			}
		} catch (e) {
			console.error('failed to run test', e);
			this[FINALIZE_SUITE_KEY](test);
		}
	}

	get counters() {
		const r = {};
		this.tests.forEach(t => {
			t.status in r ? r[t.status]++ : r[t.status] = 1;
		});
		return r;
	}

	[FINALIZE_SUITE_KEY](test) {
		this.dispatchEvent(new CustomEvent('testFinished', { detail: { suiteId: this.id, test: test } }));

		//	if none running - let some time pass and check for a suite full stop
		if (this.tests.every(t => t.status > STATUSES.RUNNING)) {
			setTimeout(() => {
				if (this.tests.every(t => t.status > STATUSES.RUNNING)) {
					this.duration = performance.now() - this.start - 96;
					this[FINISHED_RESOLVE_KEY]();
					this.dispatchEvent(new CustomEvent('finished', { detail: { suite: this } }));
				}
			}, 96);
		}
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
