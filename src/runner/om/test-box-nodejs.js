/**
 * this component SHOULD assume it is running in separate process
 * it is responsible for a single test run lifecycle:
 * - setup interop functions on the global
 * - import and execute the test code
 * - report result (and probably exit proactively?)
 */

import process from 'node:process';
import { resolve } from 'node:path';
import { runTest } from './test-runner.js';

export class TestRunBoxNodeJS {
	static async execute(test) {
		const result = new TestRunBoxNodeJS(test);
		result._setupGlobalThis();
		await result._execute(test);
		return result;
	}

	constructor(test) {
		this.test = test;

		this.runTest = runTest;

		this.runStarted = new Promise(r => {
			this.resolveStarted = r;
		});
		this.runEnded = new Promise(r => {
			this.resolveEnded = r;
		});

		Object.seal(this);
	}

	_setupGlobalThis() {
		if (!globalThis.getSuite) {
			console.log('at least once we are here');
			globalThis.getSuite = (suiteName) => {
				console.log(`here ====, ${suiteName}`);
				return {
					test: (name, code, config) => {
						//	TODO: do conditional execution
						console.log(`running the test - ${name}`);
						runTest(code, config);
					}
				}
			};
		}
	}

	async _execute(test) {
		const testScript = resolve(process.cwd(), test.source);
		await import(testScript);

		// const nodeEnv = fork(
		// 	test.source,
		// 	[
		// 		`${TESTBOX_ENVIRONMENT_KEYS.TEST_ID}=${test.id}`,
		// 		`${TESTBOX_ENVIRONMENT_KEYS.TEST_URL}=${test.source}`
		// 	],
		// 	{
		// 		stdio: 'pipe',
		// 		timeout: DEFAULT.TEST_RUN_TTL
		// 	}
		// );
		// nodeEnv.on('close', (...args) => {
		// 	console.log(args);
		// 	console.info('closed ' + test.id);
		// });
		// nodeEnv.on('error', e => { console.error(e); });
		// //	TODO: create here TestBox that will listen to messages from process and interop with the suite runner	
	}
}