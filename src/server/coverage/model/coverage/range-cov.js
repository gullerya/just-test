import BaseRange from './base-range.js.js';

export default class RangeCov extends BaseRange {
	#hits = -1;

	constructor(beg, end, hits) {
		super(beg, end);

		if (typeof hits !== 'number' || hits < 0) {
			throw new Error(`hits MUST be a non-negative number; got '${hits}'`);
		}

		this.#hits = hits;
	}

	get hits() { return this.#hits; }
}