import RangeCov from './range-cov.js';

export {
	merge,
	overlaps
}

function merge(a, b) {
	let result;
	if (isBefore(a, b)) {
		result = [a, b];
	} else if (isAfter(a, b)) {
		result = [b, a];
	} else {
		//	this is either overlap or adjacent case
		if (a.hits === b.hits) {
			result = [new RangeCov(Math.min(a.beg, b.beg), Math.max(a.end, b.end), a.hits)];
		} else {
			result = [];
			const points = Array.from(new Set([a.beg, a.end, b.beg, b.end])).sort((a1, b1) => a1 < b1 ? -1 : 1);
			const moreSpecific = isWithin(a, b) ? a : b;
			const lessSpecific = a === moreSpecific ? b : a;
			for (let i = 0, l = points.length - 1; i < l; i++) {
				const bp = points[i];
				const ep = points[i + 1];
				const r = new RangeCov(bp, ep, includes(moreSpecific, bp) ? moreSpecific.hits : lessSpecific.hits);
				result.push(r);
			}
		}
	}

	return result;
}

function isAfter(thisRange, otherRange) {
	return thisRange.beg > otherRange.end;
}

function isBefore(thisRange, otherRange) {
	return thisRange.end < otherRange.beg;
}

function isWithin(thisRange, otherRange) {
	return thisRange.beg >= otherRange.beg && thisRange.end <= otherRange.end;
}

function overlaps(thisRange, otherRange) {
	return thisRange.beg < otherRange.end && thisRange.end > otherRange.beg;
}

function includes(thisRange, point) {
	return point >= thisRange.beg && point < thisRange.end;
}