import { constants } from './utils.js';

export function obtainSuite(suiteName) {
	let result = suites[suiteName];
	if (!result) {
		result = new Suite(suiteName);
		suites[suiteName] = result;
	}
	return result;
}

const suites = {};

class Suite {
	constructor(suiteName) {
		if (!suiteName || typeof suiteName !== 'string') {
			throw new Error(`suite name MUST be a non-empty string; found '${suiteName}'`);
		}

		this.name = suiteName;
		this.tests = {};
		this.syncTail = Promise.resolve();
	}

	addTest(meta, frame) {
		if (this.tests[meta.name]) {
			throw new Error(`test '${meta.name}' already found in suite '${this.name}'`);
		}
		this.tests[meta.name] = Object.assign({}, meta, {
			frame: frame
		});
	}

	test(testName) {
		const test = this.tests[testName];

		if (!test) {
			throw new Error(`test '${testName}' not found in suite '${this.name}'`);
		}

		if (test.skip) {
			//	update model
			return;
		}

		if (test.sync) {
			const oldSyncTail = this.syncTail;
			this.syncTail = new Promise(resolve => {
				test.resolveEnd = resolve;
			});
			oldSyncTail.finally(() => {
				test.frame.postMessage({
					type: constants.RUN_TEST_ACTION, suiteName: this.name, testName: testName
				}, document.location.origin);
			});
		} else {
			test.frame.postMessage({
				type: constants.RUN_TEST_ACTION, suiteName: this.name, testName: testName
			}, document.location.origin);
		}

		// try {
		// 	this.model.tests.push(testParams);
		// 	const testModel = this.model.tests[this.model.tests.length - 1];
		// 	testModel.code = testCode;
		// 	testModel.status = STATUSES.QUEUED;
		// 	this.dispatchEvent(new Event('testAdded'));
		// 	if (testModel.sync) {
		// 		this.syncTail = this.syncTail.finally(async () => {
		// 			const tr = await test(testModel);
		// 			this[ON_TEST_FINISHED_KEY](tr);
		// 		});
		// 	} else {
		// 		const tr = await test(testModel)
		// 		this[ON_TEST_FINISHED_KEY](tr);
		// 	}
		// } catch (e) {
		// 	this[ON_TEST_FINISHED_KEY](e);
		// }
	}

	// [ON_TEST_FINISHED_KEY](result) {
	// 	this.model.done++
	// 	if (result === STATUSES.PASSED) {
	// 		this.model.passed++;
	// 	} else if (result instanceof Error || result === STATUSES.FAILED || result === STATUSES.ERRORED) {
	// 		this.model.failed++;
	// 	} else if (result === STATUSES.SKIPPED) {
	// 		this.model.skipped++;
	// 	}

	// 	this.dispatchEvent(new CustomEvent('testFinished', { detail: { result: result } }));

	// 	if (this.model.done === this.model.tests.length) {
	// 		setTimeout(() => {
	// 			if (this.model.done === this.model.tests.length) {
	// 				this.model.duration = performance.now() - this.start - SUITE_DONE_PROBING_DELAY;
	// 				this[DONE_RESOLVER_KEY]();
	// 				this.dispatchEvent(new CustomEvent('finished', { detail: { suiteModel: this.model } }));
	// 			}
	// 		}, SUITE_DONE_PROBING_DELAY);
	// 	}
	// }
}