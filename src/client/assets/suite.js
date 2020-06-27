import { STATUSES, runTest } from './test.js';

const
	SUITE_CTOR_PARAMS = ['id', 'name'],
	SUITE_DONE_PROBING_DELAY = 96,
	DONE_RESOLVER_KEY = Symbol('finished.resolve.key'),
	ON_TEST_FINISHED_KEY = Symbol('finalize.suite.key');

let suiteIdSource = 0;

export class Suite extends EventTarget {
	constructor(model) {
		super();
		if (!model || typeof model !== 'object') {
			throw new Error('suite model MUST be a non-null object');
		}

		//	normalize id and name option
		if (!('id' in model)) {
			model.id = suiteIdSource++;
		} else if (!['number', 'string'].includes(typeof model.id)) {
			console.warn(`suite 'id' MUST be either number or string; got '${model.id}'; falling back to the internal one`);
			model.id = suiteIdSource++;
		}
		if (!model.name) {
			model.name = model.id;
		}

		Object.keys(model).forEach(key => {
			if (!SUITE_CTOR_PARAMS.includes(key)) {
				console.error(`unexpected parameter '${key}' passed to suite c-tor`);
			}
		});

		Object.assign(model, {
			tests: [],
			done: 0,
			passed: 0,
			failed: 0,
			skipped: 0,
			duration: null
		});

		this.id = model.id;
		this.model = model;
		this.syncTail = Promise.resolve();
		this.done = new Promise(resolve => { this[DONE_RESOLVER_KEY] = resolve; });
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
					this[DONE_RESOLVER_KEY]();
					this.dispatchEvent(new CustomEvent('finished', { detail: { suiteModel: this.model } }));
				}
			}, SUITE_DONE_PROBING_DELAY);
		}
	}
}