import { initStateService, stateService } from './services/state/state-service-factory.js';
import { runSession } from './services/session-service.js';
import { getTestId, getValidName } from './common/interop-utils.js';

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
	console.info(`seting environment up (interactive = ${Boolean(metadata.interactive)})...`);
	await initStateService(metadata.interactive);
	installTestRegistrationAPIs();
	await collectTests(metadata.testPaths);
	console.info('... all set');

	//	auto session execution
	await runSession(metadata);

	if (!metadata.interactive) {
		await runFinalizationSequence(metadata);
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

	const envConfig = await getEnvironment();
	console.info(`session:environment IDs: '${envConfig.sessionId}':'${envConfig.id}'`);

	console.info(`... metadata fetched (${(performance.now() - started).toFixed(1)}ms)`);
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

async function runFinalizationSequence(metadata) {
	console.log(`reporting '${metadata.sessionId}':'${metadata.id}' results...`);
	const reportSessionResponse = await fetch(`/api/v1/sessions/${metadata.sessionId}/environments/${metadata.id}/result`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(stateService.getAll())
	});
	if (reportSessionResponse.status === 201) {
		console.log(`... reported`);
	} else {
		console.error(`... report failed, status: ${reportSessionResponse.status}`);
	}
}