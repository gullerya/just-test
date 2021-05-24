import RangeCov from './range-cov.js';
import { merge, overlaps } from './range-utils.js';

export default class LineCov extends RangeCov {
	constructor(number, beg, end) {
		super(beg, end, 0);
		this.number = number;
		this.ranges = [new RangeCov(beg, end, 0)];
	}

	//	this method should:
	//	- trim new range cov to the max of the line
	//	- stitch new range cov to the existing strip
	//	- preserve it's hits value during the stitch
	addRangeCov(rangeCov) {
		if (overlaps(rangeCov, this)) {
			const newRange = new RangeCov(Math.max(this.beg, rangeCov.beg), Math.min(this.end, rangeCov.end), rangeCov.hits);
			this.ranges.forEach((existingRange, i, a) => {
				if (overlaps(newRange, existingRange)) {
					try {
						a.splice(i, 1, ...merge(existingRange, newRange));
					} catch (e) {
						merge(existingRange, newRange);
					}
				}
			});
		}
	}

	isCoveredFull() {
		return this.ranges.every((rc, i, a) => {
			return !(
				rc.hits === 0 ||								//	must have hits
				(i === 0 && rc.beg > this.beg) ||				//	first must start with the line
				(i === a.length - 1 && rc.end < this.end) ||	//	last must end with the line
				(i < a.length - 1 && rc.end < a[i + 1].beg)		//	middle must stitch to the next
			);
		});
	}

	isCoveredPart() {
		return this.ranges.some(rc => rc.hits > 0) && !this.isCoveredFull();
	}
}