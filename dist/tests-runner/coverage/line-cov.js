import RangeCov from './range-cov.js';

export default class LineCov extends RangeCov {
	constructor(number, beg, end) {
		super(beg, end, 0);
		this.number = number;
		this.ranges = [];
	}

	addRangeCov(range) {
		if (!this.overlaps(range)) {
			return;
		}
		const tmpRng = new RangeCov(Math.max(this.beg, range.beg), Math.min(this.end, range.end), range.hits);
		//	TODO: stich the ranges together and in correct place
		this.ranges.push(tmpRng);
	}
}