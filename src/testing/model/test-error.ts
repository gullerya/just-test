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
		return {
			name: this.#name,
			type: this.#type,
			message: this.#message,
			stack: this.#stack,
			cause: this.#cause ? this.#cause.toJSON() : null
		};
	}

	static fromError(error: Error): TestError {
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
}