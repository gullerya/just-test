export default class BaseRange {
	constructor(beg, end) {
		if (typeof beg !== 'number' || beg < 0) {
			throw new Error(`beg MUST be a non-negative number; got '${beg}'`);
		}
		if (typeof end !== 'number' || end < 0) {
			throw new Error(`end MUST be a non-negative number; got '${end}'`);
		}
		if (beg >= end) {
			throw new Error(`beg MUST preceed end; got beg = ${beg}, end = ${end}`);
		}

		this.beg = beg;
		this.end = end;
	}

	isAfterNonAdjacent(otherRange) {
		BaseRange.validate(otherRange);
		return this.beg > otherRange.end;
	}

	isBeforeNonAdjacent(otherRange) {
		BaseRange.validate(otherRange);
		return this.end < otherRange.beg;
	}

	isWithin(otherRange) {
		BaseRange.validate(otherRange);
		return this.beg >= otherRange.beg && this.end <= otherRange.end;
	}

	contains(otherRange) {
		BaseRange.validate(otherRange);
		return otherRange.beg >= this.beg && otherRange.end <= this.end;
	}

	includes(point) {
		if (typeof point !== 'number') {
			throw new Error(`invalid point parameter ${point}`);
		}
		return point >= this.beg && point < this.end;
	}

	static validate(...args) {
		for (const range of args) {
			if (!range ||
				typeof range !== 'object' ||
				typeof range.beg !== 'number' ||
				typeof range.end !== 'number') {
				throw new Error(`invalid range parameter ${range}`);
			}
		}
	}
}