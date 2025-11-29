export class Suite {
	id: string = 'unspecified';
	name: string = 'unspecified';
	config: object = {};
	timestamp: number = -1;
	time: number = -1;
	tests: any[] = [];

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
			id: this.id,
			name: this.name,
			config: this.config,
			timestamp: this.timestamp,
			time: this.time,
			tests: this.tests,
			total: this.total,
			done: this.done,
			skip: this.skip,
			pass: this.pass,
			fail: this.fail,
			error: this.error
		};
	}
}