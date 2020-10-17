/**
 * Manages observable executions state (browser environment only)
 */
import { ties } from '/libs/data-tier/dist/data-tier.min.js';

export {
	obtainSuite,
	addTest,
	getTest,
	getUnSourced,
	getExecutionData
}

const
	MODEL_KEY = 'justTestModel',
	model = ties.get(MODEL_KEY) ? ties.get(MODEL_KEY) : ties.create(MODEL_KEY, {
		total: 0,
		done: 0,
		duration: null,
		skip: 0,
		pass: 0,
		fail: 0,
		error: 0,
		suites: []
	}),
	SUITE_PROTO = Object.freeze({
		name: 'Unspecified',
		options: {},
		total: null,
		done: null,
		duration: null,
		skip: null,
		pass: null,
		fail: null,
		error: null,
		tests: []
	}),
	TEST_PROTO = Object.freeze({
		name: 'Unspecified',
		source: null,
		options: {},
		lastRun: null,
		runs: []
	}),
	RUN_PROTO = Object.freeze({
		start: null,
		status: null,
		result: null,
		duration: null
	});

function obtainSuite(suiteName, options) {
	if (!model.suites.some(s => s.name === suiteName)) {
		model.suites.push(Object.assign({}, SUITE_PROTO, {
			name: suiteName,
			options: options
		}));
	}
	return model.suites.find(s => s.name === suiteName);
}

function addTest(suiteName, testName, testCode, testOptions) {
	const suite = obtainSuite(suiteName);
	if (getTestInternal(suite, testName)) {
		throw new Error(`test '${testName}' already found in suite '${suiteName}'`);
	}

	suite.tests.push(Object.assign({}, TEST_PROTO, {
		name: testName,
		code: testCode,
		options: testOptions
	}));
}

function getTest(suiteName, testName) {
	const suite = obtainSuite(suiteName);
	return getTestInternal(suite, testName);
}

function getTestInternal(suite, testName) {
	return suite.tests.find(t => t.name === testName);
}

function getUnSourced() {
	return model.suites.flatMap(s =>
		s.tests.filter(t =>
			t.source === null
		)
	);
}

/**
 * extract a relevant metadata to create a full execution set
 * 
 * TODO: probably later on this can accept some options to create partial set
 * @returns Array - suites/tests definitions
 */
function getExecutionData() {
	const suitesData = model.suites.map(suite => {
		return {
			name: suite.name,
			options: Object.assign({}, suite.options),
			tests: suite.tests.map(test => {
				return {
					name: test.name,
					source: test.source,
					options: Object.assign({}, test.options)
				};
			})
		};
	});
	return Object.freeze({
		suites: suitesData
	});
}

// function runTest(testName) {
// 	const test = this.tests[testName];

// 	if (!test) {
// 		throw new Error(`test '${testName}' not found in suite '${this.name}'`);
// 	}

// 	const run = {};
// 	test.runs.push(run);
// 	if (test.skip) {
// 		run.result = RESULT.SKIP;
// 	} else {
// 		if (test.sync) {
// 			const oldSyncTail = this.syncTail;
// 			this.syncTail = new Promise(resolve => {
// 				test.resolveEnd = resolve;
// 			});
// 			oldSyncTail.finally(() => {
// 				test.frame.postMessage({
// 					type: EVENTS.RUN_TEST_ACTION, suiteName: this.name, testName: testName
// 				}, document.location.origin);
// 			});
// 		} else {
// 			test.frame.postMessage({
// 				type: EVENTS.RUN_TEST_ACTION, suiteName: this.name, testName: testName
// 			}, document.location.origin);
// 		}
// 	}
// }