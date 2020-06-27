import RangeCov from './range-cov.js';

export default class LineCov extends RangeCov {
	constructor(number, beg, end) {
		super(beg, end);
		this.number = number;
		this.covRanges = [new RangeCov(beg, end, 0)];
	}

	//	this method should:
	//	- trim new range cov to the max of the line
	//	- stitch new range cov to the existing strip
	//	- preserve it's hits value during the stitch
	addRangeCov(rangeCov) {
		if (rangeCov.overlaps(this)) {
			const newRange = new RangeCov(Math.max(this.beg, rangeCov.beg), Math.min(this.end, rangeCov.end), rangeCov.hits);
			this.covRanges.forEach((existingRange, i, a) => {
				if (newRange.overlaps(existingRange)) {
					try {
						a.splice(i, 1, ...RangeCov.merge(existingRange, newRange));
					} catch (e) {
						RangeCov.merge(existingRange, newRange);
					}
				}
			});
		}
	}

	isCoveredFull() {
		return this.covRanges.every((rc, i, a) => {
			return !(
				rc.hits === 0 ||								//	must have hits
				(i === 0 && rc.beg > this.beg) ||				//	frist must start with the line
				(i === a.length - 1 && rc.end < this.end) ||	//	last must end with the line
				(i < a.length - 1 && rc.end < a[i + 1].beg)		//	middle must stitch to the next
			);
		});
	}

	isCoveredPart() {
		return this.covRanges.some(rc => rc.hits > 0) && !this.isCoveredFull();
	}
}