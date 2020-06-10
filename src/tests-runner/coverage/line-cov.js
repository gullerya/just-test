import RangeCov from './range-cov.js';

export default class LineCov extends RangeCov {
	constructor(number, beg, end) {
		super(beg, end, 0);
		this.number = number;
		this.rangeCovs = [];
	}

	//	this method should:
	//	- trim new range cov to the max of the line
	//	- stitch new range cov to the existing strip
	//	- preserve it's hits value during the stitch
	addRangeCov(rangeCov) {
		if (this.overlaps(rangeCov)) {
			const newRange = new RangeCov(Math.max(this.beg, rangeCov.beg), Math.min(this.end, rangeCov.end), rangeCov.hits);
			const added = this.rangeCovs.some((existingRange, i, a) => {
				if (newRange.beg <= existingRange.beg) {
					//	tail of new overlaps
					if (newRange.end >= existingRange.beg && newRange.hits === existingRange.hits) {
						existingRange.beg = newRange.beg;
					} else if (newRange.end >= existingRange.beg && newRange.hits !== existingRange.hits) {
						if (newRange.end === existingRange.end) {
							existingRange.hits = newRange.hits;
						} else {
							existingRange.beg = newRange.end;
							a.splice(i, 0, newRange);
						}
					} else {
						a.splice(i, 0, newRange);
					}
					return true;
				} else if (newRange.beg < existingRange.end) {
					//	head of new overlaps

				} else {
					return false;
				}
			});
			if (!added) {
				this.rangeCovs.push(newRange);
			}
		}
	}

	isCoveredFull() {
		return this.rangeCovs.every((rc, i, a) => {
			return !(
				rc.hits === 0 ||								//	must have hits
				(i === 0 && rc.beg > this.beg) ||				//	frist must start with the line
				(i === a.length - 1 && rc.end < this.end) ||	//	last must end with the line
				(i < a.length - 1 && rc.end < a[i + 1].beg)		//	middle must stitch to the next
			);
		});
	}

	isCoveredPart() {
		return this.rangeCovs.some(rc => rc.hits > 0);
	}
}