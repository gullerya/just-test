import { runSession } from './session-service.js';
import { SUITE_OPTIONS_DEFAULT, TEST_OPTIONS_DEFAULT } from '../common/constants.js';
import { getTestId, getValidName } from '../common/interop-utils.js';
import { P, ready as performanceReady } from '../common/performance-utils.js';

export {
	loadMetadata,
	execute
}

let _stateService;

/**
 * runs main flow
 * - sets up environment (TODO: do the env setup environment based)
 * - auto executes test session
 * - signals server upon finalization if non-interactive
 */
async function execute(metadata, stateService) {
	_stateService = stateService;

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

/**
 * fetches test session definitions
 */
async function loadMetadata() {
	await performanceReady;
	const started = P.now();
	console.info(`fetching test session metadata...`);

	const envConfig = await getEnvironment();
	console.info(`session:environment IDs: '${envConfig.sessionId}':'${envConfig.id}'`);

	console.info(`... metadata fetched (${(P.now() - started).toFixed(1)}ms)`);
	return envConfig;
}

/**
 * looks for an environment ID in URL params and fetches
 * no ID - assumes interactive mode -> fetch from server
 */
async function getEnvironment() {
	const sesId = await getSessionId();
	const envId = await getEnvironmentId(sesId);
	const [config, testPaths] = await Promise.all([
		(await fetch(`/api/v1/sessions/${sesId}/environments/${envId}/config`)).json(),
		(await fetch(`/api/v1/sessions/${sesId}/environments/${envId}/test-file-paths`)).json()
	]);
	config.testPaths = testPaths;
	config.sessionId = sesId;
	return config;
}

/**
 * looks for session ID in URL params
 * if not present, asks for the current interactive
 * if fails - throws
 */
async function getSessionId() {
	const sp = new URL(globalThis.location.href).searchParams;
	let sesId = sp.get('ses-id');
	if (!sesId) {
		const r = await fetch('/api/v1/sessions/interactive');
		if (!r.ok) {
			throw new Error(`failed to load interactive session; status: ${r.status}`);
		}
		const session = await r.json();
		sesId = session.id;
	}
	if (!sesId) {
		throw new Error(`failed to obtain session ID`);
	}
	return sesId;
}

/**
 * looks for environment ID in URL params
 * if not present, asks for the interactive based on sesson ID
 * if fails - throws
 */
async function getEnvironmentId(sesId) {
	const sp = new URL(globalThis.location.href).searchParams;
	let envId = sp.get('env-id');
	if (!envId) {
		if (!sesId) {
			throw new Error(`no environment ID found in URL and session ID is empty (${sesId})`);
		}
		const r = await fetch(`/api/v1/sessions/${sesId}/environments/interactive`);
		if (!r.ok) {
			throw new Error(`failed to load interactive environment of session '${sesId}'; status: ${r.status}`);
		}
		const environment = await r.json();
		envId = environment.id;
	}
	if (!envId) {
		throw new Error(`failed to obtain environment ID`);
	}
	return envId;
}

/**
 * installs top level APIs on the top scope object for the registration pass
 * - getSuite: returns a suite-bound registration APIs
 */
function installTestRegistrationAPIs() {
	console.info('installing registration APIs');
	Object.defineProperty(globalThis, 'getSuite', { value: getSuite });
}

//	TODO: on each failure here user should get a visual feedback
/**
 * imports suites/tests metadata
 * - has a side effect of collecting suites/tests metadata in the state service
 * 
 * @param {string[]} testsResources - array of paths
 * @param {object} stateService - state service
 */
async function collectTests(testsResources, stateService) {
	const started = P.now();
	console.info(`fetching ${testsResources.length} test resource/s...`);

	for await (const tr of testsResources) {
		try {
			await import(`/tests/${tr}`);
			stateService.getUnSourced().forEach(t => t.source = tr);
		} catch (e) {
			console.error(`failed to import '${tr}':`, e);
		}
	}

	console.info(`... test resources fetched (${(P.now() - started).toFixed(1)}ms)`);
}

//	TODO: this and below are registration methods
//	TODO: move them into suite-runner.js
//	TODO: on each failure here user should get a visual feedback
function getSuite(suiteName, suiteOptions) {
	const suiteMeta = validateNormalizeSuiteParams(suiteName, suiteOptions);
	_stateService.obtainSuite(suiteMeta.name, suiteMeta.options);

	return {
		test: (testName, testCode, testOptions) => {
			try {
				const testMeta = validateNormalizeTestParams(testName, testCode, testOptions);
				const testId = getTestId(suiteName, testMeta.name);
				_stateService.addTest(suiteName, testMeta.name, testId, testMeta.code, testMeta.options);
			} catch (e) {
				console.error(`failed to register test '${testName} : ${JSON.stringify(testOptions)}':`, e);
			}
		}
	}
}

function validateNormalizeSuiteParams(sName, options) {
	const result = {};

	//	name
	result.name = getValidName(sName);

	//	options
	if (options !== undefined && typeof options !== 'object') {
		throw new Error(`suite options, if/when provided, MUST be an object, got '${options}'`);
	}
	result.options = Object.freeze(Object.assign({}, SUITE_OPTIONS_DEFAULT, options));

	return result;
}

function validateNormalizeTestParams(tName, code, options) {
	const result = {};

	//	name
	result.name = getValidName(tName);

	//	code (validation only)
	if (!code || typeof code !== 'function') {
		throw new Error(`test code MUST be a function, got '${code}'`);
	}

	//	options
	if (options !== undefined && typeof options !== 'object') {
		throw new Error(`test options, if/when provided, MUST be an object, got '${options}'`);
	}
	result.options = Object.freeze(Object.assign({}, TEST_OPTIONS_DEFAULT, options));

	return result;
}