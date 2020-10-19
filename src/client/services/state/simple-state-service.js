/**
 * Manages simple session state (nodejs environment or non-UI reflected plain one)
 * - module is stateless, providing only the c~tor to create the service instance
 */

const
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
		duration: null,
		status: null,
		result: null,
		error: null
	});

export default class SimpleStateService {
	constructor(initState) {
		//	TODO: validate that the provided initState is in a good shape
		this.model = initState || {
			total: 0,
			done: 0,
			duration: null,
			skip: 0,
			pass: 0,
			fail: 0,
			error: 0,
			suites: []
		};
	}

	obtainSuite(suiteName, options) {
		if (!this.model.suites.some(s => s.name === suiteName)) {
			this.model.suites.push(Object.assign({}, SUITE_PROTO, {
				name: suiteName,
				options: options
			}));
		}
		return this.model.suites.find(s => s.name === suiteName);
	}

	getTest(suiteName, testName) {
		const suite = this.obtainSuite(suiteName);
		return SimpleStateService.getTestInternal(suite, testName);
	}

	/**
	 * extracts all tests from all suites that has no source set
	 * 
	 * @returns {array} - flattened array of tests, that are missing source
	 */
	getUnSourced() {
		return this.model.suites.flatMap(s =>
			s.tests.filter(t =>
				t.source === null
			)
		);
	}

	addTest(suiteName, testName, testCode, testOptions) {
		const suite = this.obtainSuite(suiteName);
		if (SimpleStateService.getTestInternal(suite, testName)) {
			throw new Error(`test '${testName}' already found in suite '${suiteName}'`);
		}

		suite.tests.push(Object.assign({}, TEST_PROTO, {
			name: testName,
			code: testCode,
			options: testOptions
		}));
	}

	/**
	 * updates test with the just started run info
	 * - adds the new run to the runs list
	 * - sets the new run as the last run
	 * 
	 * @param {string} suiteName - suite name
	 * @param {string} testName - test name
	 * @param {object} run - run data
	 */
	updateRunStarted(suiteName, testName, run) {
		const test = this.getTest(suiteName, testName);
		const nRun = Object.assign({}, RUN_PROTO, run);
		test.runs.push(nRun);
		test.lastRun = nRun;
	}

	/**
	 * updates test last run with the given data
	 * 
	 * @param {string} suiteName - suite name
	 * @param {string} testName - test name
	 * @param {object} run - run data
	 */
	updateRunEnded(suiteName, testName, run) {
		const test = this.getTest(suiteName, testName);
		Object.assign(test.runs[test.runs.length - 1], run);
		Object.assign(test.lastRun, run);
	}

	/**
	 * extracts a relevant metadata to create a full execution set
	 * 
	 * @returns Array - suites/tests definitions
	 */
	getExecutionData() {
		const suitesData = this.model.suites.map(suite => {
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

	static getTestInternal(suite, testName) {
		return suite.tests.find(t => t.name === testName);
	}
}