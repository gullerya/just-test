import * as DataTier from '/libs/data-tier/dist/data-tier.min.js';
import { Test, Run } from './model.js';
import { EVENTS, RESULT } from './utils.js';

export function obtainSuite(suiteName) {
	let result = suites[suiteName];
	if (!result) {
		result = new Suite(suiteName);
		suites[suiteName] = result;
	}
	return result;
}

const suites = {};
const model = DataTier.ties.create('justTestModel', {
	total: 0,
	done: 0,
	duration: null,
	skipped: 0,
	passed: 0,
	failed: 0,
	error: 0,
	suites: []
});

class Suite {
	constructor(suiteName) {
		if (!suiteName || typeof suiteName !== 'string') {
			throw new Error(`suite name MUST be a non-empty string; found '${suiteName}'`);
		}

		this.name = suiteName;
		this.tests = {};
		this.syncTail = Promise.resolve();

		model.suites.push({
			name: suiteName,
			total: 0,
			done: 0,
			duration: null,
			skipped: 0,
			passed: 0,
			failed: 0,
			error: 0,
			tests: []
		});
		this.model = model.suites[model.suites.length - 1];
	}

	addTest(meta, frame) {
		if (this.tests[meta.name]) {
			throw new Error(`test '${meta.name}' already found in suite '${this.name}'`);
		}
		const test = new Test(meta.name, frame);
		this.tests[meta.name] = test;

		model.total++;
		this.model.tests.push({
			name: test.name,
			lastRun: null
		});
	}

	runTest(testName) {
		const test = this.tests[testName];

		if (!test) {
			throw new Error(`test '${testName}' not found in suite '${this.name}'`);
		}

		const run = new Run();
		test.runs.push(run);
		if (test.skip) {
			run.result = RESULT.SKIP;
		} else {
			if (test.sync) {
				const oldSyncTail = this.syncTail;
				this.syncTail = new Promise(resolve => {
					test.resolveEnd = resolve;
				});
				oldSyncTail.finally(() => {
					test.frame.postMessage({
						type: EVENTS.RUN_TEST_ACTION, suiteName: this.name, testName: testName
					}, document.location.origin);
				});
			} else {
				test.frame.postMessage({
					type: EVENTS.RUN_TEST_ACTION, suiteName: this.name, testName: testName
				}, document.location.origin);
			}
		}
	}

	endTest(testName, run) {
		//	TODO: resolve pending promise
		console.debug(testName, run);
		model.done++;
		const sModel = model.suites.find(s => s.name === this.name);
		sModel.passed++;
	}
}