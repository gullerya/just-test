import { STATUS } from '../../common/constants.js';

export class TestRun {
	timestamp: number = -1;
	time: number = -1;
	status: string = STATUS.INIT;
	error: Error | null = null;
	coverage: any | null;

	constructor() {
		this.timestamp = null;
		this.time = null;
		this.status = null;
		this.error = null;
		this.coverage = null;
		Object.seal(this);
	}

	toJSON(): object {
		return {
			timestamp: this.timestamp,
			time: this.time,
			status: this.status,
			error: this.error ? {
				name: this.error.name,
				message: this.error.message,
				stack: this.error.stack,
				type: this.error.constructor.name
			} : null,
			coverage: this.coverage
		};
	}
}