import { STATUS } from '../../common/constants.js';
import { TestError } from './test-error.ts';

export class TestRun {
	timestamp: number = 0;
	time: number = 0;
	status: string = STATUS.INIT;
	error: TestError | null = null;
	coverage: any | null;

	constructor() {
		Object.seal(this);
	}

	toJSON(): object {
		return {
			timestamp: this.timestamp,
			time: this.time,
			status: this.status,
			error: this.error instanceof TestError ? this.error.toJSON() : null,
			coverage: this.coverage
		};
	}
}