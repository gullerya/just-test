export default class Range {
	constructor(beg, end) {
		if (beg >= end) {
			throw new Error(`beg MUST preceed end; got beg = ${beg}, end = ${end}`);
		}
		this.beg = beg;
		this.end = end;
	}

	overlaps(otherRange) {
		return this.beg < otherRange.end && this.end > otherRange.beg;
	}

	isWithin(otherRange) {
		return this.beg >= otherRange.beg && this.end <= otherRange.end;
	}

	startsBefore(otherRange) {
		return this.beg < otherRange.beg;
	}

	startsAfter(otherRange) {
		return this.beg >= otherRange.end;
	}

	endsAfter(otherRange) {
		return this.end > otherRange.end;
	}
}