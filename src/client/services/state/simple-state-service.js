/**
 * Manages simple session state (nodejs environment or non-UI reflected plain one)
 * - module is stateless, providing only the c~tor to create the service instance
 */
import { STATUS } from '../../common/constants.js';

const
	SUITE_PROTO = Object.freeze({
		name: 'Unspecified',
		options: {},
		total: null,
		done: null,
		timestamp: null,
		time: null,
		skip: null,
		pass: null,
		fail: null,
		tests: []
	}),
	TEST_PROTO = Object.freeze({
		id: null,
		name: 'Unspecified',
		source: null,
		options: {},
		lastRun: null,
		runs: []
	}),
	RUN_PROTO = Object.freeze({
		timestamp: null,
		time: null,
		status: null,
		error: null
	});

export default class SimpleStateService {
	constructor(initState) {
		this.model = initState || {
			total: 0,
			done: 0,
			timestamp: null,
			time: null,
			skip: 0,
			pass: 0,
			fail: 0,
			suites: []
		};
		console.info(`state service ${this.constructor.name} initialized`);
	}

	setSessionId(sessionId) {
		this.model.sessionId = sessionId;
	}

	setEnvironmentId(environmentId) {
		this.model.environmentId = environmentId;
	}

	getAll() {
		return this.model;
	}

	obtainSuite(suiteName, options) {
		let result = this.model.suites.find(s => s.name === suiteName);
		if (!result) {
			result = Object.assign({}, SUITE_PROTO, {
				name: suiteName,
				options: options,
				tests: []
			});
			this.model.suites.push(result);
		}
		return result;
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

	addTest(suiteName, testName, testId, testCode, testOptions) {
		const suite = this.obtainSuite(suiteName);
		if (SimpleStateService.getTestInternal(suite, testName)) {
			throw new Error(`test '${testName}' already found in suite '${suiteName}'`);
		}

		const test = Object.assign({}, TEST_PROTO, {
			id: testId,
			name: testName,
			code: testCode,
			options: testOptions,
			runs: []
		});
		if (testOptions.skip) {
			test.lastRun = { status: STATUS.SKIP };
		}
		suite.tests.push(test);

		this.model.total++;
		if (testOptions.skip) {
			this.model.skip++;
			this.model.done++;
		}

		if (suite.tests.length === 1) {
			suite.timestamp = Date.now();
		}
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
		const pRun = test.lastRun;
		const lRun = Object.assign({}, RUN_PROTO, run, { status: STATUS.RUNS });
		test.runs.push(lRun);
		test.lastRun = lRun;
		if (pRun) {
			this.model[pRun.status]--;
			this.model.done--;
		}
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
		this.model[run.status]++;
		this.model.done++;
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
						id: test.id,
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

	setSelectedTest(suiteName, testName) {
		this.model.selectedTest = this.getTest(suiteName, testName);
	}

	static getTestInternal(suite, testName) {
		return suite.tests.find(t => t.name === testName);
	}
}