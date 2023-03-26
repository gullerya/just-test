export {
	assert,
	AssertionError
};

class AssertionError extends Error {
	#actual;
	#expected;
	#operator;

	constructor({ message, actual, expected, operator }) {
		super(`failed on '${operator}'
			expected: ${JSON.stringify(expected)}
			received: ${JSON.stringify(actual)}
			message: ${message}`);
		this.#actual = actual;
		this.#expected = expected;
		this.#operator = operator;
	}
}

class Assert {
	equal(actual, expected, message) {
		if (actual != expected) {
			throw new AssertionError({ message, actual, expected, operator: 'equal' });
		}
	}
	notEqual(actual, expected, message) {
		if (actual == expected) {
			throw new AssertionError({ message, actual, expected, operator: 'notEqual' });
		}
	}

	strictEqual(actual, expected, message) {
		if (actual !== expected) {
			throw new AssertionError({ message, actual, expected, operator: 'strictEqual' });
		}
	}
	notStrictEqual(actual, expected, message) {
		if (actual === expected) {
			throw new AssertionError({ message, actual, expected, operator: 'notStrictEqual' });
		}
	}

	match(string, regexp, message) {
		if (!string.match(regexp)) {
			throw new AssertionError({ message, string, regexp, operator: 'match' });
		}
	}
	doesNotMatch(string, regexp, message) {
		if (string.match(regexp)) {
			throw new AssertionError({ message, string, regexp, operator: 'doesNotMatch' });
		}
	}

	deepEqual(actual, expected, message) {
		if (expected == null && actual == null) {
			return true;
		}
		for (const key in expected) {
			if (typeof expected[key] === 'object') {
				this.deepEqual(actual[key], expected[key], message);
			} else if (actual[key] != expected[key]) {
				throw new AssertionError({ message, actual, expected, operator: 'deepEqual' });
			}
		}
	}
	// notDeepEqual(actual, expected, message) {
	// 	if (!expected || !actual) {
	// 		return true;
	// 	}
	// 	for (const key of expected) {
	// 		if (typeof expected[key] === 'object') {
	// 			this.notDeepEqual(actual[key], expected[key], message);
	// 		} else if (actual[key] != expected[key]) {
	// 			throw new AssertionError({ message, actual, expected, operator: 'deepEqual' });
	// 		}
	// 	}
	// }

	deepStrictEqual(actual, expected, message) {
		if (expected === null && actual === null) {
			return true;
		}
		if (expected === undefined && actual === undefined) {
			return true;
		}
		for (const key in expected) {
			if (typeof expected[key] === 'object') {
				this.deepStrictEqual(actual[key], expected[key], message);
			} else if (actual[key] !== expected[key]) {
				throw new AssertionError({ message, actual, expected, operator: 'deepStrictEqual' });
			}
		}
		for (const key in actual) {
			if (typeof expected[key] === 'object') {
				this.deepStrictEqual(actual[key], expected[key], message);
			} else if (actual[key] !== expected[key]) {
				throw new AssertionError({ message, actual, expected, operator: 'deepStrictEqual' });
			}
		}
	}
	// notDeepStrictEqual(actual, expected, message) {

	// }

	doesNotReject(asyncFn, error = Error, message) {
		return asyncFn()
			.catch(e => {
				if (e instanceof error || e.message?.indexOf(error) >= 0) {
					throw new AssertionError({ message, actual: e, expected: error, operator: 'doesNotReject' });
				}
			});
	}
	async rejects(asyncFn, error, message) {
		try {
			await asyncFn();
		} catch (e) {
			this.#assertError(e, error, message, 'rejects');
			return;
		}
		throw new AssertionError({ message, actual: undefined, expected: error, operator: 'rejects' });
	}

	doesNotThrow(fn, error = Error, message) {
		try {
			fn();
		} catch (e) {
			if (e instanceof error || e.message?.indexOf(error) >= 0) {
				throw new AssertionError({ message, actual: e, expected: error, operator: 'doesNotThrow' });
			}
		}
	}
	throws(fn, error, message) {
		try {
			fn();
		} catch (e) {
			this.#assertError(e, error, message, 'throws');
			return;
		}
		throw new AssertionError({ message, actual: undefined, expected: error, operator: 'throws' });
	}

	isTrue(value, message) {
		if (value !== true) {
			throw new AssertionError({ message, value, expected: true, operator: 'isTrue' });
		}
	}

	isFalse(value, message) {
		if (value !== false) {
			throw new AssertionError({ message, value, expected: false, operator: 'isFalse' });
		}
	}

	fail(message) {
		throw new AssertionError({ message });
	}

	ifError(value) {
		if (value !== undefined && value !== null) {
			throw new AssertionError({ actual: value, expected: 'undefined or null', operator: 'ifError' });
		}
	}

	#assertError(error, expected, message, operator) {
		if (!error) {
			throw new AssertionError({ message, actual: error, expected, operator });
		}
		if (!expected) {
			return;
		}
		if (expected instanceof RegExp) {
			if (!error.message?.match(expected)) {
				throw new AssertionError({ message, actual: error, expected, operator });
			} else {
				return;
			}
		} else if (typeof expected === 'object' || typeof expected === 'function') {
			if (!(error instanceof expected)) {
				throw new AssertionError({ message, actual: error, expected, operator });
			}
		} else if (typeof expected === 'string') {
			if (!error.message?.includes(expected)) {
				throw new AssertionError({ message, actual: error, expected, operator });
			} else {
				return;
			}
		}
	}
}

const assert = new Assert();