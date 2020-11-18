/**
 * This service executes tests as running in NodeJS environment
 */

import { RESULT } from '/core/utils/interop-utils.js';

const
	RANDOM_CHARSETS = Object.freeze({ numeric: '0123456789', alphaLower: 'abcdefghijklmnopqrstuvwxyz', alphaUpper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' }),
	DEFAULT_CHARSET = RANDOM_CHARSETS.alphaLower + RANDOM_CHARSETS.alphaUpper + RANDOM_CHARSETS.numeric,
	DEFAULT_RANDOM_LENGTH = 8;

export { RANDOM_CHARSETS, executeTest }

class TestAssets {
	constructor() {
		this.asserts = 0;
	}
}

class AssertError extends Error { }

class TimeoutError extends AssertError { }

async function executeTest({ meta, code }) {
	const run = {};

	if (meta.skip) {
		run.result = RESULT.SKIP;
	} else {
		//	check if a single document required/provided
		//	if not - create document and inject the full script of the test with only running this single test

		let runResult;
		const testAssets = new TestAssets();
		const start = performance.now();
		await Promise
			.race([
				new Promise(resolve => setTimeout(resolve, meta.ttl, new TimeoutError('timeout'))),
				new Promise(resolve => Promise.resolve(code(testAssets)).then(resolve).catch(resolve))
			])
			.then(r => { runResult = r; })
			.catch(e => { runResult = e; })
			.finally(() => {
				run.duration = performance.now() - start;
				finalizeRun(meta, run, runResult, testAssets);
			});
	}

	return run;
}

function finalizeRun(meta, run, result, testAssets) {
	if (result instanceof Error) {
		const pe = processError(result);
		if (meta.expectError && (pe.type === meta.expectError || pe.message.includes(meta.expectError))) {
			run.result = RESULT.PASS;
		} else {
			run.result = result instanceof AssertError ? RESULT.FAIL : RESULT.ERROR;
			run.error = pe;
		}
	} else {
		if (meta.expectError) {
			run.result = RESULT.FAIL;
			run.error = processError(new AssertError(`expected an error with '${meta.expectError}' but not seen`));
		} else {
			run.result = RESULT.PASS;
		}
	}
	run.asserts = testAssets.asserts;
}

//	TODO: return custom object instead of extended native Error
function processError(error) {
	if (!(error instanceof Error)) {
		throw new Error(`error expected; found '${error}'`);
	}

	const replacable = window.location.origin;
	error.type = error.constructor.name;
	error.stackLines = error.stack.split(/\r\n|\r|\n/)
		.map(l => l.trim())
		.map(l => l.replace(replacable, ''));
	error.stackLines.shift();
	//	TODO: probably extract file location from each line...
	return error;
}

TestAssets.prototype.waitNextTask = async () => {
	return new Promise(resolve => setTimeout(resolve, 0));
}

TestAssets.prototype.waitMillis = async millis => {
	return new Promise(resolve => setTimeout(resolve, millis));
}

TestAssets.prototype.getRandom = (outputLength = DEFAULT_RANDOM_LENGTH, randomCharsets) => {
	if (!outputLength || typeof outputLength !== 'number' || isNaN(outputLength) || outputLength > 128) {
		throw new Error(`invalid length ${outputLength}`);
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
	const random = crypto.getRandomValues(new Uint8Array(outputLength));
	for (let i = 0; i < outputLength; i++) {
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