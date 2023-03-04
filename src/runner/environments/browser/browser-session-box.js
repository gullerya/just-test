/**
 * Browser specific SESSION runner
 * - runs as part of automation or interactive
 * - interacts with the JustTest server over the standard REST APIs
 * - manages tests execution: frames/workers, lifecycle reporting
 */

import * as serverAPI from '../../server-api-service.js';
import SimpleStateService from '../../simple-state-service.js';
import { runSession } from '../../session-service.js';
import { getEnvironmentConfig } from '../../environment-config.js';
import { getValidName } from '../../../common/interop-utils.js';
import { SUITE_CONFIG_DEFAULT } from '../../../common/constants.js';

(async () => {
	let sesEnvResult;
	let envConfig;
	const stateService = new SimpleStateService();
	try {
		envConfig = await getEnvironmentConfig();
		const metadata = await loadMetadata(envConfig.sesId, envConfig.envId);
		await execute(metadata, stateService);
		sesEnvResult = stateService.getAll();
	} catch (e) {
		console.error(e);
		console.error('session execution failed due to the previous error/s');
		//	TODO: the below one should probably be replaced with the error state
		sesEnvResult = stateService.getAll();
	} finally {
		await serverAPI.reportSessionResult(envConfig.sesId, envConfig.envId, location.origin, sesEnvResult);
	}
})();

async function loadMetadata(sesId, envId) {
	const started = globalThis.performance.now();
	console.info(`fetching test session metadata...`);
	const envConfig = await serverAPI.getSessionMetadata(sesId, envId, location.origin);
	console.info(`... metadata fetched (${(globalThis.performance.now() - started).toFixed(1)}ms)`);
	return envConfig;
}

async function execute(metadata, stateService) {
	//	environment setup
	console.info(`setting up test execution environment...`);
	stateService.setSessionId(metadata.sessionId);
	stateService.setEnvironmentId(metadata.id);
	installTestRegistrationAPIs();
	await collectTests(metadata.testPaths, stateService);
	console.info('... all set');

	//	auto session execution
	await runSession(metadata, stateService);
}

function installTestRegistrationAPIs() {
	console.info('installing registration APIs');
	Object.defineProperty(globalThis, 'getSuite', { value: getSuite });
}

function getSuite(suiteName, suiteConfig) {
	const suiteMeta = validateNormalizeSuiteParams(suiteName, suiteConfig);
	_stateService.obtainSuite(suiteMeta.name, suiteMeta.config);

	return {
		test: (testName, testCode, testConfig) => {
			try {
				const testMeta = validateNormalizeTestParams(testName, testCode, testConfig);
				const testId = getTestId(suiteName, testMeta.name);
				_stateService.addTest(suiteName, testMeta.name, testId, testMeta.code, testMeta.config);
			} catch (e) {
				console.error(`failed to register test '${testName} : ${JSON.stringify(testConfig)}':`, e);
			}
		}
	};
}

async function collectTests(testsResources, stateService) {
	const started = globalThis.performance.now();
	console.info(`fetching ${testsResources.length} test resource/s...`);

	for await (const tr of testsResources) {
		try {
			await import(`/tests/${tr}`);
			stateService.getUnSourced().forEach(t => t.source = tr);
		} catch (e) {
			console.error(`failed to import '${tr}':`, e);
		}
	}

	console.info(`... test resources fetched (${(globalThis.performance.now() - started).toFixed(1)}ms)`);
}

function validateNormalizeSuiteParams(sName, config) {
	const result = {};

	//	name
	result.name = getValidName(sName);

	//	configuration
	if (config !== undefined && typeof config !== 'object') {
		throw new Error(`suite config, if/when provided, MUST be an object, got '${config}'`);
	}
	result.config = Object.freeze(Object.assign({}, SUITE_CONFIG_DEFAULT, config));

	return result;
}

function validateNormalizeTestParams(tName, code, config) {
	const result = {};

	//	name
	result.name = getValidName(tName);

	//	code (validation only)
	if (!code || typeof code !== 'function') {
		throw new Error(`test code MUST be a function, got '${code}'`);
	}

	//	configuration
	if (config !== undefined && typeof config !== 'object') {
		throw new Error(`test config, if/when provided, MUST be an object, got '${config}'`);
	}
	result.config = Object.freeze(Object.assign({}, TEST_CONFIG_DEFAULT, config));

	return result;
}