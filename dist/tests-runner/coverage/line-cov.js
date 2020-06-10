import RangeCov from './range-cov.js';

export default class LineCov extends RangeCov {
	constructor(number, beg, end) {
		super(beg, end, 0);
		this.number = number;
		this.rangeCovs = [];
	}

	addRangeCov(newRange) {
		if (this.overlaps(newRange)) {
			const tmpRng = new RangeCov(Math.max(this.beg, newRange.beg), Math.min(this.end, newRange.end), newRange.hits);
			const added = this.rangeCovs.some((existingRange, i, a) => {
				if (tmpRng.startsBefore(existingRange)) {
					if (tmpRng.end >= existingRange.beg && tmpRng.hits === existingRange.hits) {
						existingRange.beg = tmpRng.beg;
					} else {
						a.splice(i, 0, tmpRng);
					}
					return true;
				} else {
					return false;
				}
			});
			if (!added) {
				this.rangeCovs.push(tmpRng);
			}
		}
	}

	isFullCovered() {
		return this.rangeCovs.every((rc, i, a) => {
			return !(
				rc.hits === 0 ||								//	must have hits
				(i === 0 && rc.beg > this.beg) ||				//	frist must start with the line
				(i === a.length - 1 && rc.end < this.end) ||	//	last must end with the line
				(i < a.length - 1 && rc.end < a[i + 1].beg)		//	middle must stitch to the next
			);
		});
	}

	isPartCovered() {
		return this.rangeCovs.some(rc => rc.hits > 0);
	}
}