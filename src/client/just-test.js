import { constants, getId } from './utils.js';
import { RANDOM_CHARSETS, executeTest } from './test-executor.js';

export {
	getSuite,
	RANDOM_CHARSETS
}

const
	testsMap = {};

window.addEventListener('message', async event => {
	if (event.origin !== document.location.origin) {
		throw new Error(`expected message for '${document.location.origin}', received one for '${event.origin}'`);
	}

	if (event.data.type === constants.RUN_TEST_ACTION) {
		const testId = getId(event.data.suiteName, event.data.testName);
		const test = testsMap[testId];
		await executeTest(test);
		window.parent.postMessage({
			type: constants.TEST_ENDED_EVENT,
			suiteName: event.data.suiteName,
			testName: event.data.testName
		});
	}
});

function getSuite(name) {
	return {
		suiteName: name,
		test: registerTest
	}
}

function registerTest(name, code, options) {
	try {
		const normalizedMeta = validateNormalizeParams(name, code, options);

		console.debug(normalizedMeta);

		const testId = getId(this.suiteName, normalizedMeta.name);
		testsMap[testId] = { meta: normalizedMeta, code: code };

		window.parent.postMessage({
			type: constants.TEST_ADDED_EVENT,
			suiteName: this.suiteName,
			meta: normalizedMeta
		});
	} catch (e) {
		console.error(`failed to process test '${name} : ${JSON.stringify(options)}':`, e);
	}
}

const TEST_OPTIONS_DEFAULT = Object.freeze({
	ttl: 3000,
	skip: false,
	sync: false,
	expectError: ''
});

function validateNormalizeParams(name, code, options) {
	const tmp = {};

	//	name
	if (!name || typeof name !== 'string') {
		throw new Error(`test name MUST be a non-empty string, got '${name}'`);
	}
	tmp.name = name;

	//	code
	if (typeof code !== 'function') {
		throw new Error(`test code MUST be a function, got '${code}'`);
	}

	//	options
	if (options !== undefined) {
		if (!options || typeof options !== 'object') {
			throw new Error(`test options, if/when provided, MUST be a non-null object, got '${options}'`);
		}
		Object.keys(options).forEach(key => {
			if (key in TEST_OPTIONS_DEFAULT) {
				if (typeof options[key] !== typeof TEST_OPTIONS_DEFAULT[key]) {
					throw new Error(`unexpected type of '${key}'; expected '${typeof TEST_OPTIONS_DEFAULT[key]}', found '${typeof options[key]}'`);
				}
				tmp[key] = options[key];
			} else {
				console.warn(`unexpected option '${key}' passed to test`);
			}
		});
	}

	return Object.assign({}, TEST_OPTIONS_DEFAULT, tmp);
}