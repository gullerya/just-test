import { EVENTS, RESULT } from './utils.js';

const
	testEventsBus = getTestEventsBus(),
	RANDOM_CHARSETS = Object.freeze({ numeric: '0123456789', alphaLower: 'abcdefghijklmnopqrstuvwxyz', alphaUpper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' }),
	DEFAULT_CHARSET = RANDOM_CHARSETS.alphaLower + RANDOM_CHARSETS.alphaUpper + RANDOM_CHARSETS.numeric,
	DEFAULT_RANDOM_LENGTH = 8;

class TestAssets {
	constructor() {
		this.asserts = 0;
	}
}

class AssertError extends Error { }

class TimeoutError extends AssertError { }

window.getSuite = suiteName => {
	return {
		test: (testName, testCode, options) => {
			const currentTestId = `${suiteName}|${testName}`;
			if (window.testIdToRun !== currentTestId) {
				return;
			}

			const normalizedOptions = Object.assign({}, {
				ttl: 3000,
				skip: false,
				sync: false,
				expectError: ''
			}, options);
			executeTest(suiteName, testName, testCode, normalizedOptions);
		}
	}
};

async function executeTest(suiteName, testName, testCode, options) {
	dispatchRunStartEvent(suiteName, testName);

	const run = {};

	let runResult;
	const testAssets = new TestAssets();
	const start = performance.now();
	await Promise
		.race([
			new Promise(resolve => setTimeout(resolve, options.ttl, new TimeoutError('timeout'))),
			new Promise(resolve => Promise.resolve(testCode(testAssets)).then(resolve).catch(resolve))
		])
		.then(r => { runResult = r; })
		.catch(e => { runResult = e; })
		.finally(() => {
			run.duration = performance.now() - start;
			finalizeRun(options, run, runResult, testAssets);
		});

	dispatchRunEndEvent(suiteName, testName, run);
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

function processError(error) {
	if (!(error instanceof Error)) {
		throw new Error(`error expected; found '${error}'`);
	}

	const replacable = window.location.origin;
	const stackLines = error.stack.split(/\r\n|\r|\n/)
		.map(l => l.trim())
		.map(l => l.replace(replacable, ''));
	stackLines.shift();

	//	TODO: probably extract file location from each line...
	return {
		name: error.name,
		type: error.constructor.name,
		message: error.message,
		stackLines: stackLines
	};
}

function getTestEventsBus() {
	if (globalThis.window) {
		let tmp = globalThis.window;
		while (tmp.parent && tmp.parent !== tmp) tmp = tmp.parent;
		return tmp;
	} else {
		throw new Error('NodeJS is not yet supported');
	}
}

function dispatchRunStartEvent(suiteName, testName) {
	const e = new CustomEvent(EVENTS.RUN_STARTED, {
		detail: {
			suite: suiteName,
			test: testName
		}
	});
	testEventsBus.dispatchEvent(e);
}

function dispatchRunEndEvent(suiteName, testName, run) {
	const e = new CustomEvent(EVENTS.RUN_ENDED, {
		detail: {
			suite: suiteName,
			test: testName,
			run: run
		}
	});
	testEventsBus.dispatchEvent(e);
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