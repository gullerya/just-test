import BaseRange from './base-range.js';

export default class LineCov extends BaseRange {
	constructor(number, beg, end) {
		super(beg, end, 0);
		this.number = number;
	}
}