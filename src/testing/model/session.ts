import { Suite } from './suite.ts';

export class Session {
	sessionId: string = 'unspecified';
	environmentId: string = 'unspecified';
	timestamp: number = 0;
	time: number = 0;
	suites: Suite[] = [];
	errors: (Error & { type: string })[] = [];

	total: number = 0;
	done: number = 0;
	skip: number = 0;
	pass: number = 0;
	fail: number = 0;
	error: number = 0;

	onlyMode: boolean = false;

	//	session-global coverage (iframe/worker modes collapse per-test
	//	coverage here because V8 attribution is shared / absent)
	coverage: any | null = null;

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
			error: this.error,
			coverage: this.coverage
		};
	}
}