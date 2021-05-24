import FileCov from '../../../common/models/coverage/file-cov.js';
import RangeCov from '../../../common/models/coverage/range-cov.js';

export default convert;

function convert(scriptUrl, scriptCoverage) {
	const result = new FileCov(scriptUrl);

	if (!scriptCoverage || !Array.isArray(scriptCoverage.functions)) {
		throw new Error(`invalid script coverage ${scriptCoverage}`);
	}

	for (const fCov of scriptCoverage.functions) {
		//	add up to functions coverage
		//	TODO

		//	add up to ranges coverage
		for (const rCov of fCov.ranges) {
			const jtr = new RangeCov(rCov.startOffset, rCov.endOffset, rCov.count);
			result.addRangeCov(jtr);
		}
	}

	return result;
}