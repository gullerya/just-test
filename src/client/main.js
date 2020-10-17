import './components/jt-control/jt-control.js';
import './components/jt-details/jt-details.js';
import { obtainSuite, addTest, getUnSourced } from './services/state-service.js';
import { runSession } from './services/session-executor.js';

//	main flow
//
loadMetadata()
	.then(async metadata => {
		installTestRegistrationAPIs(metadata.currentEnvironment);
		await collectTests(metadata.testPaths);
		return metadata;
	})
	.then(metadata => {
		return runSession(metadata);
	})
	.then(r => {
		//	report results here
		console.dir(r);
	})
	.catch(e => {
		console.error(e);
	})
	.finally(() => {
		console.info('all done');
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
 * 
 * @param {object} currentEnvironment - current environment for environment specific logic
 */
function installTestRegistrationAPIs(currentEnvironment) {
	console.info(`installing registration APIs for ${JSON.stringify(currentEnvironment)}`);
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
			getUnSourced().forEach(t => t.source = tr);
		} catch (e) {
			console.error(`failed to import '${tr}':`, e);
		}
	}

	console.info(`... test resources fetched (${(performance.now() - started).toFixed(1)}ms)`);
}

function getSuite(name, options) {
	if (!name || typeof name !== 'string') {
		throw new Error(`suite name MUST be a non-empty string; got '${name}'`);
	}

	const normalizedMeta = validateNormalizeSuiteParams(name, options);
	const suite = obtainSuite(normalizedMeta.name, normalizedMeta.options);
	return {
		test: registerTest.bind(suite)
	}
}

function registerTest(name, code, options) {
	try {
		const normalizedMeta = validateNormalizeTestParams(name, code, options);
		addTest(this.name, normalizedMeta.name, normalizedMeta.code, normalizedMeta.options);
	} catch (e) {
		console.error(`failed to process test '${name} : ${JSON.stringify(options)}':`, e);
	}
}

const SUITE_OPTIONS_DEFAULT = Object.freeze({
	skip: false,
	sync: false
});

function validateNormalizeSuiteParams(name, options) {
	const result = {};

	//	name
	if (!name || typeof name !== 'string') {
		throw new Error(`suite name MUST be a non-empty string, got '${name}'`);
	}
	result.name = name.trim();

	//	options
	if (options !== undefined) {
		if (!options || typeof options !== 'object') {
			throw new Error(`suite options, if/when provided, MUST be a non-null object, got '${options}'`);
		}
		result.options = Object.assign({}, SUITE_OPTIONS_DEFAULT, options);
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
	if (!name || typeof name !== 'string') {
		throw new Error(`test name MUST be a non-empty string, got '${name}'`);
	}
	result.name = name.trim();

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
	}

	return result;
}