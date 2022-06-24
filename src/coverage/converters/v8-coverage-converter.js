import { buildJTFileCov } from '../model/model-utils.js';
import RangeCov from '../model/range-cov.js';

export {
	v8toJustTest
};

/**
 * converts native V8 coverage data into a proprietary JustTest data set
 * 
 * @param {object[]} v8CoverageSet native V8 coverage
 * @param {function} sourceFetcher resolver of source text
 * @returns JustTest coverage data
 */
async function v8toJustTest(v8CoverageSet, sourceFetcher) {
	if (!Array.isArray(v8CoverageSet)) {
		throw new Error(`expected to get an array of V8 coverage objects, got: ${v8CoverageSet}`);
	}

	const resultPromises = [];
	for (const v8Coverage of v8CoverageSet) {
		const jtCoveragePromise = convertV8CoverageObject(v8Coverage, sourceFetcher);
		resultPromises.push(jtCoveragePromise);
	}
	return Promise.all(resultPromises);
}

async function convertV8CoverageObject(v8Coverage, sourceFetcher) {
	if (!v8Coverage ||
		!Array.isArray(v8Coverage.functions) ||
		!v8Coverage.url || typeof v8Coverage.url !== 'string') {
		throw new Error(`invalid V8 coverage object: ${v8Coverage}`);
	}

	const result = await buildJTFileCov(v8Coverage.url, true, sourceFetcher);

	for (const fCov of v8Coverage.functions) {
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