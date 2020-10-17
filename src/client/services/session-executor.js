/**
 * Runs a session of all suites/tests
 * - performs with the current environment (browser / node instance)
 */
import { getExecutionData } from './state-service.js';
import { ensureTestListener } from './test-executor.js';
import { RESULT } from '../utils.js';

const

	RANDOM_CHARSETS = Object.freeze({ numeric: '0123456789', alphaLower: 'abcdefghijklmnopqrstuvwxyz', alphaUpper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' }),
	DEFAULT_CHARSET = RANDOM_CHARSETS.alphaLower + RANDOM_CHARSETS.alphaUpper + RANDOM_CHARSETS.numeric,
	DEFAULT_RANDOM_LENGTH = 8;

export {
	runSession,
	RANDOM_CHARSETS
}

class TestAssets {
	constructor() {
		this.asserts = 0;
	}
}

class AssertError extends Error { }

class TimeoutError extends AssertError { }

/**
 * executes all relevant tests, according the the sync/async options
 * - performs any needed environment related adjustments
 * 
 * @param {object} metadata - session execution metadata
 * @returns Promise resolved with test results when all tests done
 */
async function runSession(metadata) {
	ensureTestListener(metadata);
	const executionData = getExecutionData();

	console.info(`TODO: setup global time out to ${metadata.settings.ttl}`);

	if (metadata.currentEnvironment.interactive) {
		await Promise.all(executionData.suites.map(executeSuite));
	} else {
		throw new Error('automated execution is not yet supported');
	}
	console.log('session done');
}

async function executeSuite(suite) {
	const testPromises = [];
	let syncChain = Promise.resolve();
	suite.tests.forEach(test => {
		if (test.options.skip) {
			testPromises.push(Promise.resolve());
		} else if (!test.options.sync) {
			testPromises.push(eTest(suite, test));
		} else {
			syncChain = syncChain.finally(() => eTest(suite, test));
		}
	});
	testPromises.push(syncChain);
	await Promise.all(testPromises);
}

async function eTest(suite, test) {
	console.log(`executing ${suite.name} - ${test.name}`);
	return Promise.resolve();
}

TestAssets.prototype.waitNextTask = async () => {
	return new Promise(resolve => setTimeout(resolve, 0));
}

TestAssets.prototype.waitMillis = async millis => {
	return new Promise(resolve => setTimeout(resolve, millis));
}

TestAssets.prototype.getRandom = (length = DEFAULT_RANDOM_LENGTH, randomCharsets) => {
	if (!length || typeof length !== 'number' || isNaN(length) || length > 128) {
		throw new Error(`invalid length ${length}`);
	}
	if (randomCharsets) {
		if (!Array.isArray(randomCharsets)) {
			throw new Error('invalid "randomCharsets" parameter - array expected');
		} else if (!randomCharsets.every(c => c && typeof c === 'string')) {
			throw new Error('invalid "randomCharsets" parameter - all members expected to be a non-empty strings');
		}
	}
	let result = '';
	const source = randomCharsets ? randomCharsets.join('') : DEFAULT_CHARSET;
	const random = crypto.getRandomValues(new Uint8Array(length));
	for (let i = 0; i < length; i++) {
		result += source.charAt(source.length * random[i] / 256);
	}
	return result;
};

TestAssets.prototype.assertEqual = function (expected, actual) {
	this.asserts++;
	if (expected !== actual) {
		throw new AssertError(`expected: ${expected}, found: ${actual}`);
	}
}

TestAssets.prototype.assertNotEqual = function (unexpected, actual) {
	this.asserts++;
	if (unexpected === actual) {
		throw new AssertError(`unexpected: ${unexpected}, found: ${actual}`);
	}
}

TestAssets.prototype.assertTrue = function (expression) {
	this.asserts++;
	if (expression !== true) {
		throw new AssertError(`expected: true, found: ${expression}`);
	}
}

TestAssets.prototype.assertFalse = function (expression) {
	this.asserts++;
	if (expression !== false) {
		throw new AssertError(`expected: false, found: ${expression}`);
	}
}

TestAssets.prototype.fail = message => {
	throw new AssertError(message);
}