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
		const run = await executeTest(test);
		window.parent.postMessage({
			type: constants.TEST_ENDED_EVENT,
			suiteName: event.data.suiteName,
			testName: event.data.testName,
			run: run
		});
	}
});

function getSuite(name) {
	return {
		suiteName: name,
		test: registerTest
	}
}

function registerTest(meta, code) {
	const normalizedMeta = validateNormalizeParams(meta, code);

	console.debug(normalizedMeta);

	const testId = getId(this.suiteName, meta.name);
	testsMap[testId] = { meta: normalizedMeta, code: code };

	window.parent.postMessage({
		type: constants.TEST_ADDED_EVENT,
		suiteName: this.suiteName,
		meta: normalizedMeta
	});
};

const TEST_META_DEFAULT = Object.freeze({
	name: '',
	ttl: 3000,
	skip: false,
	sync: false,
	expectError: ''
});

function validateNormalizeParams(meta, code) {
	if (!meta || typeof meta !== 'object') {
		throw new Error(`test meta MUST be a non-null object; found '${meta}'`);
	}
	if (typeof code !== 'function') {
		throw new Error(`test code MUST be a function; found '${code}'`);
	}

	if (!meta.name) {
		throw new Error('test name MUST be a non empty string within the options');
	}

	const tmp = {};
	Object.keys(meta).forEach(key => {
		if (key in TEST_META_DEFAULT) {
			if (typeof meta[key] !== typeof TEST_META_DEFAULT[key]) {
				throw new Error(`unexpected type of '${key}'; expected '${typeof TEST_META_DEFAULT[key]}', found '${typeof meta[key]}'`)
			}
			tmp[key] = meta[key];
		} else {
			console.warn(`unexpected parameter '${key}' passed to test`);
		}
	});
	return Object.assign({}, TEST_META_DEFAULT, tmp);
}