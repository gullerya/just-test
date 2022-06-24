//	TODO: refactor the logic to other file

import { merge } from './range-utils.js';

export default class FileCov {
	url = null;
	lines = [];
	ranges = [];
	functions = [];

	constructor(url) {
		this.url = url;

		if (!url || typeof url !== 'string') {
			throw new Error(`url MUST be a non-empty string; got: '${url}'`);
		}

		Object.freeze(this);
	}

	addLineCov(lineCov) {
		this.lines.push(lineCov);
		return this;
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
		return this;
	}

	addFunctionCov(functionCov) {
		this.functions.push(functionCov);
		return this;
	}
}