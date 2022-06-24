import BaseRange from './base-range.js';

export default class LineCov extends BaseRange {
	number = -1;

	constructor(number, beg, end) {
		super(beg, end, 0);

		if (typeof number !== 'number' || number < 0) {
			throw new Error(`line number MUST be a non-negative number; got: '${number}'`);
		}

		this.number = number;
	}
}