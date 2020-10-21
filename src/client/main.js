import './components/jt-control/jt-control.js';
import './components/jt-details/jt-details.js';
import { getStateService } from './services/state/state-service-factory.js';
import { runSession } from './services/session-service.js';
import { getTestId, getValidName } from './commons/interop-utils.js';

let stateService;

//	main flow
//	- sets up environment
//	- auto runs one session
//
loadMetadata()
	.then(async metadata => {
		console.info('seting environment up...');
		stateService = await getStateService(metadata.currentEnvironment);
		installTestRegistrationAPIs();
		await collectTests(metadata.testPaths);
		console.info('... all set');
		return metadata;
	})
	.then(metadata => {
		//	TODO: we may decide to NOT auto run session here
		const executionData = stateService.getExecutionData();
		return runSession(executionData, metadata);
	})
	.then(r => {
		//	report results here
		console.dir(r);
	})
	.catch(e => {
		console.error(e);
	});

/**
 * Fetches test session definitions
 * TODO: switch to a single API and do it as a session API (even include some session ID already)
 * 
 * @returns {Object} definitions fetched
 */
async function loadMetadata() {
	const started = performance.now();
	console.info(`fetching test session metadata...`);

	const mdResponse = await fetch('/api/v1/sessions/x/metadata');
	if (!mdResponse.ok) {
		throw new Error(`failed to load metadata; status: ${mdResponse.status}`);
	}
	const metadata = await mdResponse.json();

	console.info(`... metadata fetched (${(performance.now() - started).toFixed(1)}ms)`);
	return metadata;
}

/**
 * Installs top level APIs on the top scope object for the registration pass
 * - getSuite: returns a suite-bound registration APIs
 */
function installTestRegistrationAPIs() {
	console.info('installing registration APIs');
	Object.defineProperties(globalThis, {
		getSuite: { value: getSuite }
	});
}

/**
 * Imports suites/tests metadata
 * - has a side effect of collecting suites/tests metadata in the state service
 * 
 * @param {string[]} testsResources - array of paths
 */
async function collectTests(testsResources) {
	const started = performance.now();
	console.info(`fetching ${testsResources.length} test resource/s...`);

	for await (const tr of testsResources) {
		try {
			await import(`/tests/${tr}`);
			stateService.getUnSourced().forEach(t => t.source = tr);
		} catch (e) {
			console.error(`failed to import '${tr}':`, e);
		}
	}

	console.info(`... test resources fetched (${(performance.now() - started).toFixed(1)}ms)`);
}

function getSuite(suiteName, suiteOptions) {
	const suiteMeta = validateNormalizeSuiteParams(suiteName, suiteOptions);
	stateService.obtainSuite(suiteMeta.name, suiteMeta.options);

	return {
		test: (testName, testCode, testOptions) => {
			try {
				const testMeta = validateNormalizeTestParams(testName, testCode, testOptions);
				const testId = getTestId(suiteName, testMeta.name);
				stateService.addTest(suiteName, testMeta.name, testId, testMeta.code, testMeta.options);
			} catch (e) {
				console.error(`failed to process test '${testName} : ${JSON.stringify(testOptions)}':`, e);
			}
		}
	}
}

const SUITE_OPTIONS_DEFAULT = Object.freeze({
	skip: false,
	sync: false
});

function validateNormalizeSuiteParams(name, options) {
	const result = {};

	//	name
	result.name = getValidName(name);

	//	options
	if (options !== undefined) {
		if (!options || typeof options !== 'object') {
			throw new Error(`suite options, if/when provided, MUST be a non-null object, got '${options}'`);
		}
		result.options = Object.assign({}, SUITE_OPTIONS_DEFAULT, options);
		Object.freeze(result.options);
	}

	return result;
}

const TEST_OPTIONS_DEFAULT = Object.freeze({
	ttl: 3000,
	skip: false,
	sync: false,
	expectError: ''
});

function validateNormalizeTestParams(name, code, options) {
	const result = {};

	//	name
	result.name = getValidName(name);

	//	code (validation only)
	if (!code || typeof code !== 'function') {
		throw new Error(`test code MUST be a function, got '${code}'`);
	}

	//	options
	if (options !== undefined) {
		if (!options || typeof options !== 'object') {
			throw new Error(`test options, if/when provided, MUST be a non-null object, got '${options}'`);
		}
		result.options = Object.assign({}, TEST_OPTIONS_DEFAULT, options);
		Object.freeze(result.options);
	}

	return result;
}