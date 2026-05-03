export class TestError {
	#name: string;
	#type: string;
	#message: string;
	#stack: string;
	#cause: TestError | null;

	constructor(name, type, message, stack, cause = null) {
		this.#name = name;
		this.#type = type;
		this.#message = message;
		this.#stack = stack;
		this.#cause = cause;
	}

	get name() { return this.#name; }

	get type() { return this.#type; }

	get message() { return this.#message; }

	get stack() { return this.#stack; }

	get cause() { return this.#cause; }

	getStacklines(): string[] {
		if (!this.#stack) {
			return [];
		}
		return this.#stack.split(/\r\n|\r|\n/).map(l => l.trim()).filter(Boolean);
	}

	toJSON(): object {
		return TestError.toJSON(this);
	}

	static fromError(error: Error): TestError {
		if (error instanceof TestError) {
			return error;
		}
		if (!(error instanceof Error)) {
			throw new TypeError(`the provided value (${error}) is not an Error instance`);
		}

		return new TestError(
			error.name,
			error.constructor.name,
			error.message,
			error.stack,
			error.cause instanceof Error ? TestError.fromError(error.cause) : null
		);
	}

	static toJSON(error: Error | TestError): object {
		if (error === null) {
			return null;
		}
		//	a TestError already carries the preserved original type (from
		//	fromError's `error.constructor.name` capture); for a native
		//	Error we fall back to `constructor.name`. Using `constructor.name`
		//	on a TestError would erase the original type as "TestError".
		const type = error instanceof TestError
			? (error as TestError).type
			: error.constructor.name;
		//	TestError doesn't extend Error, so `cause instanceof Error` is
		//	false when a TestError's cause is itself a TestError; read via
		//	the getter and recurse explicitly
		const rawCause = error instanceof TestError
			? (error as TestError).cause
			: (error as Error).cause;
		const cause = rawCause instanceof Error || rawCause instanceof TestError
			? TestError.toJSON(rawCause)
			: null;
		return {
			name: error.name,
			type,
			message: error.message,
			stack: error.stack,
			cause
		};
	}
}