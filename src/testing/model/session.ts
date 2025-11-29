import { Suite } from './suite.ts';

export class Session {
	sessionId: string = 'unspecified';
	environmentId: string = 'unspecified';
	timestamp: number = -1;
	time: number = -1;
	suites: Suite[] = [];
	errors: (Error & { type: string })[] = [];

	total: number = 0;
	done: number = 0;
	skip: number = 0;
	pass: number = 0;
	fail: number = 0;
	error: number = 0;

	onlyMode: boolean = false;

	constructor() {
		Object.seal(this);
	}

	toJSON(): object {
		return {
			sessionId: this.sessionId,
			environmentId: this.environmentId,
			timestamp: this.timestamp,
			time: this.time,
			suites: this.suites,
			errors: this.errors,
			total: this.total,
			done: this.done,
			skip: this.skip,
			pass: this.pass,
			fail: this.fail,
			error: this.error
		};
	}
}