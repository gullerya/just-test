import RangeCov from './range-cov.js';

export default class LineCov extends RangeCov {
	constructor(number, beg, end) {
		super(beg, end, 0);
		this.number = number;
		this.ranges = [];
	}
}