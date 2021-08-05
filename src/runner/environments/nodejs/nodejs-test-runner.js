import process from 'node:process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { getSuiteFactory } from '../test-runner.js';
import { TestRunWorker, ENVIRONMENT_TYPES } from '../../ipc-service/ipc-service.js';
import { TESTBOX_ENVIRONMENT_KEYS } from '../../../common/constants.js';
import * as chai from 'chai';

globalThis.chai = chai;

const childToParentIPC = new TestRunWorker(ENVIRONMENT_TYPES.NODE_JS, globalThis);

//	main flow
getTest()
	.then(test => {
		return initEnvironment(test);
	})
	.then(test => {
		const rPath = pathToFileURL(resolve(test.source));
		return import(rPath);
	})
	.catch(e => {
		//	report test failure due to the error
		console.error(e);
	});

async function getTest() {
	const envTestSetup = getEnvTestSetup();
	const test = await childToParentIPC.getTestConfig(envTestSetup.testId);
	return test;
}

function initEnvironment(test) {
	globalThis.getSuite = getSuiteFactory(test, childToParentIPC);
	return test;
}

function getEnvTestSetup() {
	return {
		testId: process.argv
			.find(a => a.startsWith(TESTBOX_ENVIRONMENT_KEYS.TEST_URL))
			.replace(`${TESTBOX_ENVIRONMENT_KEYS.TEST_URL}=`, '')
	}
}
