/**
 * Manages simple session state (nodejs environment or non-UI reflected plain one)
 * - module is stateless, providing only the c~tor to create the service instance
 */
import { STATUS } from '../common/constants.js';
import { Session } from '../testing/model/session.js';
import { Suite } from '../testing/model/suite.js';
import { TestRun } from '../testing/model/test-run.js';

export default class SimpleStateService {
	#model;

	constructor(initState) {
		this.#model = initState || new Session();
	}

	setSessionId(sessionId) {
		this.#model.sessionId = sessionId;
	}

	setEnvironmentId(environmentId) {
		this.#model.environmentId = environmentId;
	}

	getResult() {
		return this.#model;
	}

	obtainSuite(suiteName, config) {
		let result = this.#model.suites.find(s => s.name === suiteName);
		if (!result) {
			result = new Suite();
			result.id = suiteName;
			result.name = suiteName;
			result.config = config;

			//	insert preserving alphabetical order
			let inserted = false;
			for (let i = 0; i < this.#model.suites.length; i++) {
				if (result.name < this.#model.suites[i].name) {
					this.#model.suites.splice(i, 0, result);
					inserted = true;
					break;
				}
			}
			if (!inserted) {
				this.#model.suites.push(result);
			}
		}
		return result;
	}

	getTest(suiteName, testName) {
		const suite = this.obtainSuite(suiteName);
		return SimpleStateService.#getTestInternal(suite, testName);
	}

	addTest(test) {
		const suite = this.obtainSuite(test.suiteName);
		if (SimpleStateService.#getTestInternal(suite, test.name)) {
			throw new Error(`test '${test.name}' already found in suite '${suite.name}'`);
		}

		if (test.config.skip) {
			const lRun = new TestRun();
			lRun.status = STATUS.SKIP;
			test.lastRun = lRun;
			test.runs.push(lRun);
		}
		suite.tests.push(test);

		//	update session globals
		this.#model.total++;
		if (test.config.skip) {
			this.#model.skip++;
			this.#model.done++;
		}

		//	update suite globals
		suite.total++;
		if (test.config.skip) {
			suite.skip++;
			suite.done++;
		}
	}

	reportSessionCoverage(coverage) {
		this.#model.coverage = coverage;
	}

	reportError(error) {
		this.#model.errors.push(error);
		this.#model.error++;
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
	updateRunStarted(suiteName, testName) {
		const test = this.getTest(suiteName, testName);
		const pRun = test.lastRun;
		const lRun = new TestRun();
		lRun.status = STATUS.RUNS;
		test.lastRun = lRun;
		test.runs.push(lRun);
		if (pRun) {
			this.#model[pRun.status]--;
			this.#model.done--;
		}

		//	update session globals
		if (!this.#model.done && !this.#model.timestamp) {
			this.#model.timestamp = Date.now();
		}

		//	update suite globals
		const suite = this.obtainSuite(suiteName);
		if (!suite.done && !suite.timestamp) {
			suite.timestamp = Date.now();
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
		if (!test.runs.length) {
			test.lastRun = run;
			test.runs.push(test.lastRun);
		} else {
			Object.assign(test.runs[test.runs.length - 1], run);
			Object.assign(test.lastRun, run);
		}

		//	update session globals
		this.#model[run.status]++;
		this.#model.done++;
		if (this.#model.done === this.#model.total) {
			this.#model.time = Date.now() - this.#model.timestamp;
		}

		//	update suite globals
		const suite = this.obtainSuite(suiteName);
		suite[run.status]++;
		suite.done++;
		if (suite.done === suite.total) {
			suite.time = Date.now() - suite.timestamp;
		}
	}

	/**
	 * extracts a relevant metadata to create a full execution set
	 * 
	 * @returns Array - suites/tests definitions
	 */
	getExecutionData() {
		const suitesData = this.#model.suites.map(suite => {
			return {
				name: suite.name,
				config: Object.assign({}, suite.config),
				tests: suite.tests.map(test => {
					return {
						name: test.name,
						source: test.source,
						config: Object.assign({}, test.config)
					};
				})
			};
		});
		return Object.freeze({
			suites: suitesData
		});
	}

	static #getTestInternal(suite, testName) {
		return suite.tests.find(t => t.name === testName);
	}
}