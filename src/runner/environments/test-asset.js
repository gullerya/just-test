import { waitInterval, waitNextTask } from '../../common/await-utils.js';
import { getRandom } from '../../common/random-utils.js';

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
		return globalThis.chai.assert;
	}

	get expect() {
		this[ASSERTIONS_KEY]++;
		return globalThis.chai.expect;
	}
}