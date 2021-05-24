export default class RangeCov {
	constructor(beg, end, hits) {
		if (typeof beg !== 'number' || beg < 0) {
			throw new Error(`beg MUST be a non-negative number; got '${beg}'`);
		}
		if (typeof end !== 'number' || end < 0) {
			throw new Error(`end MUST be a non-negative number; got '${end}'`);
		}
		if (beg >= end) {
			throw new Error(`beg MUST preceed end; got beg = ${beg}, end = ${end}`);
		}
		if (typeof hits !== 'number') {
			throw new Error(`hits MUST be a number; got '${hits}'`);
		}
		this.beg = beg;
		this.end = end;
		this.hits = hits;
	}
}