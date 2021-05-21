import Range from './range.js';

export default class RangeCov extends Range {
	constructor(beg, end, hits) {
		super(beg, end);
		this.hits = hits ?? 0;
	}

	static merge(rcA, rcB) {
		const result = [];
		if (rcA.hits === rcB.hits && (rcA.overlaps(rcB) || rcA.beg === rcB.end || rcB.beg === rcA.end)) {
			//	same hits and overlap or adjacent
			result.push(new RangeCov(Math.min(rcA.beg, rcB.beg), Math.max(rcA.end, rcB.end), rcA.hits));
		} else if (!rcA.overlaps(rcB)) {
			//	no overlap and not adjacent
			result.push(rcA, rcB);
		} else {
			//	not the same hits and either overlap or adjacent
			const bPoints = Array.from(new Set([rcA.beg, rcA.end, rcB.beg, rcB.end])).sort((a, b) => a < b ? -1 : 1);
			bPoints.forEach((bp, i, a) => {
				if (i < a.length - 1) {
					result.push(new RangeCov(bp, a[i + 1], rcB.includes(bp) ? rcB.hits : rcA.hits));
				}
			});
		}
		return result.sort((a, b) => a.beg < b.beg ? -1 : 1);
	}
}