/**
 * Manages simple session state (nodejs environment or non-UI reflected plain one)
 * - module is stateless, providing only the c~tor to create the service instance
 */
import { STATUS } from '../common/constants.js';
import { Session } from '../testing/model/session.ts';
import { Suite } from '../testing/model/suite.ts';
import { TestError } from '../testing/model/test-error.ts';
import { TestRun } from '../testing/model/test-run.ts';

export default class SimpleStateService {
	#session: Session;

	constructor(initState = new Session()) {
		this.#session = initState;
	}

	get session(): Session {
		return this.#session;
	}

	obtainSuite(suiteName: string, config: object = {}): Suite {
		let result = this.#session.suites.find(s => s.name === suiteName);
		if (!result) {
			result = new Suite();
			result.id = suiteName;
			result.name = suiteName;
			result.config = config;

			//	insert preserving alphabetical order
			let inserted = false;
			for (let i = 0; i < this.#session.suites.length; i++) {
				if (result.name < this.#session.suites[i].name) {
					this.#session.suites.splice(i, 0, result);
					inserted = true;
					break;
				}
			}
			if (!inserted) {
				this.#session.suites.push(result);
			}
		}
		return result;
	}

	getTest(suiteName: string, testName: string) {
		const suite = this.obtainSuite(suiteName);
		return SimpleStateService.#getTestInternal(suite, testName);
	}

	addTest(test) {
		const suite = this.obtainSuite(test.suiteName);
		if (SimpleStateService.#getTestInternal(suite, test.name)) {
			throw new Error(`test '${test.name}' already found in suite '${suite.name}'`);
		}

		if (test.config.only) {
			suite.onlyMode = true;
		}

		if (test.config.skip) {
			const lRun = new TestRun();
			lRun.status = STATUS.SKIP;
			test.lastRun = lRun;
			test.runs.push(lRun);
		}
		suite.tests.push(test);

		//	update session globals
		this.#session.total++;
		if (test.config.skip) {
			this.#session.skip++;
			this.#session.done++;
		}

		//	update suite globals
		suite.total++;
		if (test.config.skip) {
			suite.skip++;
			suite.done++;
		}
	}

	reportError(error: TestError): void {
		this.#session.errors.push(error);
		this.#session.error++;
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
	updateRunStarted(suiteName: string, testName: string): void {
		const test = this.getTest(suiteName, testName);
		const pRun = test.lastRun;
		const lRun = new TestRun();
		lRun.status = STATUS.RUNS;
		test.lastRun = lRun;
		test.runs.push(lRun);
		if (pRun) {
			this.#session[pRun.status]--;
			this.#session.done--;
		}

		//	update session globals
		if (!this.#session.done && !this.#session.timestamp) {
			this.#session.timestamp = Date.now();
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
	updateRunEnded(suiteName: string, testName: string, run: TestRun): void {
		const test = this.getTest(suiteName, testName);
		if (!test.runs.length) {
			test.lastRun = run;
			test.runs.push(test.lastRun);
		} else {
			Object.assign(test.runs[test.runs.length - 1], run);
			Object.assign(test.lastRun, run);
		}

		//	update session globals
		this.#session[run.status]++;
		this.#session.done++;
		if (this.#session.done === this.#session.total) {
			this.#session.time = Date.now() - this.#session.timestamp;
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
	getExecutionData(): Session {
		return this.#session;
	}

	static #getTestInternal(suite: Suite, testName: string) {
		return suite.tests.find(t => t.name === testName);
	}
}