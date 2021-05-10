import { waitMillis, waitNextTask } from './await-utils.js';
import { getRandom } from './random-utils.js';

import '/libs/chai/chai.js';

const chai = globalThis.chai;

export class TestAsset {
	constructor() {
		this.asserts = 0;
		this.waitNextTask = waitNextTask;
		this.waitMillis = waitMillis;
		this.getRandom = getRandom;
	}

	get assert() {
		this.asserts++;
		return chai.assert;
	}

	get expect() {
		this.asserts++;
		return chai.expect;
	}
}