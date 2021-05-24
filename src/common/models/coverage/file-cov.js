import { merge } from './range-utils.js';

export default class FileCov {
	constructor(url) {
		this.url = url;
		this.lines = [];
		this.ranges = [];
		this.functions = [];
		Object.freeze(this);
	}

	addLineCov() {

	}

	addRangeCov(rangeCov) {
		const added = this.ranges.some((tr, ti, ta) => {
			if (rangeCov.isBeforeNonAdjacent(tr)) {
				ta.splice(ti, 0, rangeCov);
				return true;
			} else if (rangeCov.isWithin(tr) || rangeCov.contains(tr)) {
				ta.splice(ti, 1, ...merge(tr, rangeCov));
				return true;
			} else {
				return false;
			}
		});
		if (!added) {
			this.ranges.push(rangeCov);
		}
	}

	addFunctionCov() {

	}
}