import { waitInterval, waitNextTask } from './await-utils.js';
import { getRandom } from './random-utils.js';

//	This should be abstracted away, probably on be testbox environment basis
import '/libs/chai/chai.js';

const chai = globalThis.chai;
const ASSERTIONS_KEY = Symbol('assertions');

export class TestAsset {
	constructor() {
		this[ASSERTIONS_KEY] = 0;

		this.waitNextTask = waitNextTask;
		this.waitInterval = waitInterval;
		this.getRandom = getRandom;

		Object.seal(this);
	}

	get assertions() {
		return this[ASSERTIONS_KEY];
	}

	get assert() {
		this[ASSERTIONS_KEY]++;
		return chai.assert;
	}

	get expect() {
		this[ASSERTIONS_KEY]++;
		return chai.expect;
	}
}