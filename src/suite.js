import { STATUSES, runTest } from './test.js';

const
	SUITE_DONE_PROBING_DELAY = 96,
	FINISHED_RESOLVE_KEY = Symbol('finished.resolve.key'),
	ON_TEST_FINISHED_KEY = Symbol('finalize.suite.key');

let suiteIdSource = 0;

export class Suite extends EventTarget {
	constructor(model) {
		super();
		if (!model || typeof model !== 'object') {
			throw new Error('suite model MUST be a non-null object');
		}
		if (!model.name || typeof model.name !== 'string') {
			throw new Error('name MUST be a non empty string in the suite model');
		}

		Object.assign(model, {
			id: suiteIdSource++,
			tests: [],
			done: 0,
			passed: 0,
			failed: 0,
			skipped: 0,
			duration: null
		});

		this.model = model;
		this.syncTail = Promise.resolve();
		this.finished = new Promise(resolve => { this[FINISHED_RESOLVE_KEY] = resolve; });
	}

	async runTest(testParams, testCode) {
		if (this.skip) {
			return;
		}

		if (!this.start) {
			this.start = performance.now();
		}

		try {
			this.model.tests.push(testParams);
			const testModel = this.model.tests[this.model.tests.length - 1];
			testModel.code = testCode;
			testModel.status = STATUSES.QUEUED;
			this.dispatchEvent(new Event('testAdded'));
			if (testModel.sync) {
				this.syncTail = this.syncTail.finally(async () => {
					const tr = await runTest(testModel);
					this[ON_TEST_FINISHED_KEY](tr);
				});
			} else {
				const tr = await runTest(testModel)
				this[ON_TEST_FINISHED_KEY](tr);
			}
		} catch (e) {
			this[ON_TEST_FINISHED_KEY](e);
		}
	}

	[ON_TEST_FINISHED_KEY](result) {
		this.model.done++
		if (result === STATUSES.PASSED) {
			this.model.passed++;
		} else if (result instanceof Error || result === STATUSES.FAILED || result === STATUSES.ERRORED) {
			this.model.failed++;
		} else if (result === STATUSES.SKIPPED) {
			this.model.skipped++;
		}

		this.dispatchEvent(new CustomEvent('testFinished', { detail: { result: result } }));

		if (this.model.done === this.model.tests.length) {
			setTimeout(() => {
				if (this.model.done === this.model.tests.length) {
					this.model.duration = performance.now() - this.start - SUITE_DONE_PROBING_DELAY;
					this[FINISHED_RESOLVE_KEY]();
					this.dispatchEvent(new CustomEvent('finished', { detail: { suiteModel: this.model } }));
				}
			}, SUITE_DONE_PROBING_DELAY);
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
