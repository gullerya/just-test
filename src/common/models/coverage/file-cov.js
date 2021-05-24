import RangeCov from './range-cov.js';

export default class FileCov {
	constructor(url) {
		this.url = url;
		this.functions = [];
		this.ranges = [];
		this.lines = [];
		Object.seal(this);
	}

	addRangeCov(rangeCov) {
		const added = this.ranges.some((tr, ti, ta) => {
			if (rangeCov.startsBefore(tr)) {
				ta.splice(ti, 0, rangeCov);
				return true;
			} else if (rangeCov.isWithin(tr)) {
				ta.splice(ti, 1, ...RangeCov.merge(tr, rangeCov));
				return true;
			} else {
				return false;
			}
		});
		if (!added) {
			this.ranges.push(rangeCov);
		}
	}
}