import { initStateService, stateService } from './services/state/state-service-factory.js';
import { runSession } from './services/session-service.js';
import { getTestId, getValidName } from './utils/interop-utils.js';

runMainFlow();

/**
 * runs main flow
 * - sets up environment (TODO: do the env setup environment based)
 * - auto executes test session
 * - signals server upon finalization if non-interactive
 */
async function runMainFlow() {
	const metadata = await loadMetadata();

	//	environment setup
	console.info('seting environment up...');
	await initStateService(metadata.currentEnvironment);
	installTestRegistrationAPIs();
	await collectTests(metadata.testPaths);
	console.info('... all set');

	//	auto session execution
	await autorunSession(metadata);

	if (!metadata.currentEnvironment.interactive) {
		console.log('send signal to server to run finalization sequence (reporting, shutdown)');
	} else {
		console.log('continue in interactive mode');
	}
}

/**
 * fetches test session definitions
 */
async function loadMetadata() {
	const started = performance.now();
	console.info(`fetching test session metadata...`);

	//	get all sessions
	const sessionsResponse = await fetch('/api/v1/sessions');
	if (!sessionsResponse.ok) {
		throw new Error(`failed to load sessions; status: ${sessionsResponse.status}`);
	}
	const sessions = await sessionsResponse.json();

	//	find interactive session (first one as of now)
	const interactiveSession = Object.values(sessions).find(s => {
		return s &&
			s.config &&
			s.config.environments &&
			(s.config.environments.length === 0 || s.config.environments[0].interactive);
	});
	if (!interactiveSession) {
		throw new Error(`no interactive sessions found`);
	}

	const mdResponse = await fetch(`/api/v1/sessions/${interactiveSession.id}/config`);
	if (!mdResponse.ok) {
		throw new Error(`failed to load metadata; status: ${mdResponse.status}`);
	}
	const metadata = await mdResponse.json();

	console.info(`... metadata fetched (${(performance.now() - started).toFixed(1)}ms)`);
	return metadata;
}

/**
 * installs top level APIs on the top scope object for the registration pass
 * - getSuite: returns a suite-bound registration APIs
 */
function installTestRegistrationAPIs() {
	console.info('installing registration APIs');
	Object.defineProperties(globalThis, {
		getSuite: { value: getSuite }
	});
}

/**
 * imports suites/tests metadata
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

async function autorunSession(metadata) {
	await runSession(metadata);
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

const TEST_OPTIONS_DEFAULT = Object.freeze({
	ttl: 3000,
	skip: false,
	sync: false,
	expectError: ''
});

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