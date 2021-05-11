import { waitMillis, waitNextTask } from './await-utils.js';
import { getRandom } from './random-utils.js';

//	This should be abstracted away, probably on be testbox environment basis
import '/libs/chai/chai.js';

const chai = globalThis.chai;
const ASSERTS_KEY = Symbol('asserts');

export class TestAsset {
	constructor() {
		this[ASSERTS_KEY] = 0;

		this.waitNextTask = waitNextTask;
		this.waitMillis = waitMillis;
		this.getRandom = getRandom;
	}

	get asserts() {
		return this[ASSERTS_KEY];
	}

	get assert() {
		this[ASSERTS_KEY]++;
		return chai.assert;
	}

	get expect() {
		this[ASSERTS_KEY]++;
		return chai.expect;
	}
}