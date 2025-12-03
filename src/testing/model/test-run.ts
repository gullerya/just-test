import { STATUS } from '../../common/constants.js';
import { TestError } from './test-error.ts';

export class TestRun {
	timestamp: number = 0;
	time: number = 0;
	status: string = STATUS.INIT;
	#error: TestError | null = null;
	coverage: any | null;

	constructor() {
		Object.seal(this);
	}

	set error(error: Error | TestError) {
		this.#error = error ? TestError.fromError(error) : null;
	}

	get error(): TestError | null {
		return this.#error;
	}

	toJSON(): object {
		return {
			timestamp: this.timestamp,
			time: this.time,
			status: this.status,
			error: this.error ? TestError.toJSON(this.error) : null,
			coverage: this.coverage
		};
	}
}