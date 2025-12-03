export {
	assert,
	AssertionError
};

class AssertionError extends Error {
	#actual: unknown;
	#expected: unknown;
	#operator: string;

	constructor(message: string, actual: unknown, expected: unknown, operator: string) {
		super(`failed on assertion '${operator}':
		expected: '${JSON.stringify(expected)}'
		received: '${JSON.stringify(actual)}'
		message: ${message}`);
		this.#actual = actual;
		this.#expected = expected;
		this.#operator = operator;
	}

	get actual(): unknown { return this.#actual; }
	get expected(): unknown { return this.#expected; }
	get operator(): string { return this.#operator; }
}

class Assert {
	equal<T>(actual: T, expected: T, message?: string): void {
		if (actual != expected) {
			throw new AssertionError(message, actual, expected, 'equal');
		}
	}
	notEqual<T>(actual: T, expected: T, message?: string): void {
		if (actual == expected) {
			throw new AssertionError(message, actual, expected, 'notEqual');
		}
	}

	strictEqual<T>(actual: T, expected: T, message?: string): void {
		if (actual !== expected) {
			throw new AssertionError(message, actual, expected, 'strictEqual');
		}
	}
	notStrictEqual<T>(actual: T, expected: T, message?: string): void {
		if (actual === expected) {
			throw new AssertionError(message, actual, expected, 'notStrictEqual');
		}
	}

	match(string: string, regexp: RegExp, message?: string): void {
		if (!string.match(regexp)) {
			throw new AssertionError(message, string, regexp, 'match');
		}
	}
	doesNotMatch(string: string, regexp: RegExp, message?: string): void {
		if (string.match(regexp)) {
			throw new AssertionError(message, string, regexp, 'doesNotMatch');
		}
	}

	deepEqual<T extends object>(actual: T, expected: T, message?: string): void {
		if (expected == null && actual == null) {
			return;
		}
		for (const key in expected) {
			if (typeof actual[key] === 'object' && typeof expected[key] === 'object') {
				this.deepEqual(actual[key], expected[key], message);
			} else if (actual[key] != expected[key]) {
				throw new AssertionError(message, actual, expected, 'deepEqual');
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
	// 			throw new AssertionError(message, actual, expected, 'deepEqual');
	// 		}
	// 	}
	// }

	deepStrictEqual<T extends object>(actual: T, expected: T, message?: string): void {
		if (expected === null && actual === null) {
			return;
		}
		if (expected === undefined && actual === undefined) {
			return;
		}
		for (const key in expected) {
			if (typeof actual[key] === 'object' && typeof expected[key] === 'object') {
				this.deepStrictEqual(actual[key], expected[key], message);
			} else if (actual[key] !== expected[key]) {
				throw new AssertionError(message, actual, expected, 'deepStrictEqual');
			}
		}
		for (const key in actual) {
			if (typeof actual[key] === 'object' && typeof expected[key] === 'object') {
				this.deepStrictEqual(actual[key], expected[key], message);
			} else if (actual[key] !== expected[key]) {
				throw new AssertionError(message, actual, expected, 'deepStrictEqual');
			}
		}
	}
	// notDeepStrictEqual(actual, expected, message) {

	// }

	async doesNotReject(asyncFn: () => Promise<unknown>, message?: string): Promise<void> {
		try {
			await asyncFn();
		} catch (e) {
			throw new AssertionError(message, e, null, 'doesNotReject');
		}
	}

	async rejects(asyncFn: () => Promise<unknown>, error: unknown, message?: string): Promise<void> {
		try {
			await asyncFn();
		} catch (e) {
			this.#assertError(e, error, message, 'rejects');
			return;
		}
		throw new AssertionError(message, null, error, 'rejects');
	}

	doesNotThrow(fn: () => unknown, message?: string): void {
		let internalError;
		try {
			const r = fn();
			if (r instanceof Promise) {
				internalError = new AssertionError(`method ${fn.name} returned a Promise, use 'doesNotReject' assertion for it`, r, null, 'doesNotThrow');
				throw internalError;
			}
		} catch (e) {
			if (internalError) {
				throw internalError;
			}
			throw new AssertionError(message, e, null, 'doesNotThrow');
		}
	}

	throws(fn: () => unknown, error: unknown, message?: string): void {
		let internalError
		try {
			const r = fn();
			if (r instanceof Promise) {
				internalError = new AssertionError(`method ${fn.name} returned a Promise, use 'rejects' assertion for it`, r, null, 'throws');
				throw internalError;
			}
		} catch (e) {
			if (internalError) {
				throw internalError;
			}
			this.#assertError(e, error, message, 'throws');
			return;
		}
		throw new AssertionError(message, null, error, 'throws');
	}

	isTrue(value: boolean, message?: string): void {
		if (value !== true) {
			throw new AssertionError(message, value, true, 'isTrue');
		}
	}

	isFalse(value: boolean, message?: string): void {
		if (value !== false) {
			throw new AssertionError(message, value, false, 'isFalse');
		}
	}

	fail(message: string): never {
		throw new AssertionError(message, undefined, undefined, 'fail');
	}

	#assertError(error: Error, expected: unknown, message: string | undefined, operator: string) {
		if (!error) {
			throw new AssertionError(message, error, expected, operator);
		}
		if (!expected) {
			return;
		}
		if (expected instanceof RegExp) {
			if (!error.message?.match(expected)) {
				throw new AssertionError(message, error, expected, operator);
			} else {
				return;
			}
		} else if (typeof expected === 'object' || typeof expected === 'function') {
			if (!(error instanceof (expected as Function))) {
				throw new AssertionError(message, error, expected, operator);
			}
		} else if (typeof expected === 'string') {
			if (!error.message?.includes(expected)) {
				throw new AssertionError(message, error, expected, operator);
			} else {
				return;
			}
		}
	}
}

const assert = new Assert();