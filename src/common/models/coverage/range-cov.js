import BaseRange from './base-range.js';
export default class RangeCov extends BaseRange {
	constructor(beg, end, hits) {
		super(beg, end);

		if (typeof hits !== 'number' || hits < 0) {
			throw new Error(`hits MUST be a non-negative number; got '${hits}'`);
		}

		this.hits = hits;
	}
}