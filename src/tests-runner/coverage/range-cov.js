export default class Range {
	constructor(beg, end, hits) {
		this.beg = beg;
		this.end = end;
		this.hits = hits;
	}

	startsBefore(otherRange) {
		return this.beg < otherRange.beg;
	}

	endsAfter(otherRange) {
		return this.end > otherRange.end;
	}

	isWithin(otherRange) {
		return this.beg >= otherRange.beg && this.end <= otherRange.end;
	}

	overlaps(otherRange) {
		return this.beg < otherRange.end && this.end > otherRange.beg;
	}
}