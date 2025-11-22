import RangeCov from './range-cov.js';

export {
	merge,
	calcRangeCoverage
};

/**
 * merges 2 ranges according to the following rules:
 * - order of the `a` / `b` is NOT important
 * - if the ranges are DISTANT, returns both, ordered
 * - if the ranges are ADJACENT and EQUAL hits, returns one joined range of both
 * - if the ranges are ADJACENT but NOT EQUAL hits, returns both, ordered
 * - if the ranges are INCLUSIVE, merged into sequence of ranges, preserving the hits
 * 
 * @param {RangeCov} a range to merge
 * @param {RangeCov} b range to merge
 * @returns array of merged ranges
 */
function merge(a, b) {
	RangeCov.validate(a, b);

	let result;
	if (a.isBeforeNonAdjacent(b)) {
		result = [a, b];
	} else if (a.isAfterNonAdjacent(b)) {
		result = [b, a];
	} else {
		//	this is either overlap or adjacent case
		if (a.hits === b.hits) {
			result = [new RangeCov(Math.min(a.beg, b.beg), Math.max(a.end, b.end), a.hits)];
		} else {
			result = [];
			const points = Array.from(new Set([a.beg, a.end, b.beg, b.end])).sort((a1, b1) => a1 < b1 ? -1 : 1);
			const moreSpecific = a.isWithin(b) ? a : b;
			const lessSpecific = a === moreSpecific ? b : a;
			for (let i = 0, l = points.length - 1; i < l; i++) {
				const bp = points[i];
				const ep = points[i + 1];
				const r = new RangeCov(bp, ep, moreSpecific.includes(bp) ? moreSpecific.hits : lessSpecific.hits);
				result.push(r);
			}
		}
	}

	return result;
}

/**
 * verifies tested range coverage against a list of covered ranges
 * - use case for this is to get line / function / scope coverage
 * 
 * @param {Range} testedRange range that is tested for coverage
 * @param {Array<RangeCov>} coveredRanges covered ranges list
 * @returns object in shape of { min: number, max: number } of min/max hits within the tested range
 */
function calcRangeCoverage(testedRange, coveredRanges) {
	RangeCov.validate(testedRange, ...coveredRanges);

	let min = Number.MAX_VALUE, max = 0;
	for (const cr of coveredRanges) {
		if (!overlap(testedRange, cr)) {
			continue;
		}
		min = Math.min(min, cr.hits);
		max = Math.max(max, cr.hits);
	}

	return { min, max };
}

function overlap(a, b) {
	return (a.beg <= b.beg && a.end >= b.end) ||
		(a.end > b.beg && a.end <= b.end) ||
		(a.beg >= b.beg && a.beg < b.end);
}