/**
 * Test running component:
 * - presume running in isolated envirnoment/process
 * - obtain test from environment variables
 * - prepare box for the test run
 * - load and run test
 * - report test result
 */

import process from 'node:process';
import { resolve } from 'node:path';
import { TESTBOX_ENVIRONMENT_KEYS } from '../../common/constants.js';
import { runTest } from '../om/test-runner.js';

execute()
	.then(() => { })
	.catch(e => {
		throw e;
	});

async function execute() {
	const testRunConfig = await obtainConfiguration();
	//	analyze/validate config
	setupTestRunEnvironment(testRunConfig);
	await loadTest(testRunConfig);
}

async function obtainConfiguration() {
	return {
		source: process.argv
			.find(a => a.startsWith(TESTBOX_ENVIRONMENT_KEYS.TEST_URL))
			.replace(`${TESTBOX_ENVIRONMENT_KEYS.TEST_URL}=`, '')
	}
}

function setupTestRunEnvironment() {
	globalThis.getSuite = () => {
		return {
			test: (name, code, options) => {
				//	TODO: do conditional execution
				console.log(`running the test - ${name}`);
				runTest(code, options);
			}
		}
	};
}

/**
 * loading test will effectively execute it, given test run environment set up
 * 
 * @param {object} testRunConfig test run configuration
 */
async function loadTest(testRunConfig) {
	const testScript = resolve(process.cwd(), testRunConfig.source);
	await import(testScript);
}
