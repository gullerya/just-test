const
	TEST_PARAMS = ['id', 'name', 'timeout', 'sync', 'skip', 'expectError', 'code', 'status'],
	STATUSES = Object.freeze({ QUEUED: 0, SKIPPED: 1, RUNNING: 2, PASSED: 3, FAILED: 4, ERRORED: 5 }),
	DEFAULT_TIMEOUT_MILLIS = 10000;

const
	RANDOM_CHARSETS = Object.freeze({ numeric: '0123456789', alphaLower: 'abcdefghijklmnopqrstuvwxyz', alphaUpper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' }),
	DEFAULT_CHARSET = RANDOM_CHARSETS.alphaLower + RANDOM_CHARSETS.alphaUpper + RANDOM_CHARSETS.numeric;

export { STATUSES, RANDOM_CHARSETS, runTest }

class TestAssets {
	constructor() {
		this.asserts = 0;
	}
}

class AssertError extends Error { }

class TimeoutError extends AssertError { }

let testIdSequence = 0;

async function runTest(test) {
	validateModel(test);

	if (!test.id) {
		test.id = testIdSequence++;
	}
	if (!test.timeout) {
		test.timeout = DEFAULT_TIMEOUT_MILLIS;
	}

	test.error = null;
	test.start = null;
	test.duration = null;

	if (test.skip) {
		test.status = STATUSES.SKIPPED;
	} else {
		test.skip = false;
		test.status = STATUSES.RUNNING;
		test.start = performance.now();

		await new Promise((resolve, reject) => {
			const timeoutWatcher = setTimeout(() => reject(new TimeoutError('test timed out')), test.timeout);
			const ta = new TestAssets();
			Promise.resolve(test.code(ta))
				.then(resolve)
				.catch(reject)
				.finally(() => clearInterval(timeoutWatcher));
		})
			.then(r => finalizeTest(test, r))
			.catch(e => finalizeTest(test, e));
	}

	return test.status;
}

function validateModel(test) {
	if (!test || typeof test !== 'object') {
		throw new Error('test model MUST be a non-null object');
	}
	if (!test.name || typeof test.name !== 'string') {
		throw new Error('name MUST be a non empty string within the options');
	}
	if (typeof test.code !== 'function') {
		throw new Error('test code MUST be a function');
	}
	Object.keys(test).forEach(key => {
		if (!TEST_PARAMS.includes(key)) {
			console.error(`unexpected parameter '${key}' passed to run test`);
		}
	});
}

function finalizeTest(test, error) {
	if (test.status !== STATUSES.RUNNING) {
		return;
	}

	test.duration = performance.now() - test.start;
	if (error === false) {
		test.status = STATUSES.FAILED;
	} else if (error instanceof Error) {
		const pe = processError(error);
		if (test.expectError && (pe.type === test.expectError || pe.message.indexOf(test.expectError) >= 0)) {
			test.status = STATUSES.PASSED;
		} else {
			test.status = error instanceof AssertError ? STATUSES.FAILED : STATUSES.ERRORED;
			test.error = pe;
		}
	} else {
		if (test.expectError) {
			test.status = STATUSES.FAILED;
			test.error = processError(new AssertError(`expected an error "${test.expectError}" but not seen`));
		} else {
			test.status = STATUSES.PASSED;
		}
	}
}

function processError(error) {
	const replacable = window.location.origin;
	error.type = error.constructor.name;
	error.stackLines = error.stack.split(/\r\n|\r|\n/)
		.map(l => l.trim())
		.map(l => l.replace(replacable, ''));
	error.stackLines.shift();
	//	TODO: probably extract file location from each line...
	return error;
}

TestAssets.prototype.waitNextMicrotask = async () => {
	return new Promise(resolve => setTimeout(resolve, 0));
}

TestAssets.prototype.waitMillis = async millis => {
	return new Promise(resolve => setTimeout(resolve, millis));
}

TestAssets.prototype.getRandom = (length, randomCharsets) => {
	if (!length || typeof length !== 'number' || isNaN(length) || length > 128) {
		throw new Error(`invalid length ${length}`);
	}
	if (randomCharsets && (!Array.isArray(randomCharsets) || !randomCharsets.every(c => typeof c === 'string'))) {
		throw new Error(`invalid 'randomCharsets' parameter (${randomCharsets})`);
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