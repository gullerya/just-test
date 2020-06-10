import Range from './range.js';

export default class RangeCov extends Range {
	constructor(beg, end, hits) {
		super(beg, end);
		this.hits = hits;
	}
}