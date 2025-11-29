//	LCOV format reference: http://ltp.sourceforge.net/coverage/lcov/geninfo.1.php
//	in general as an example below
//	--- before zero line of report ---
//	TN:<test name>							--	optional
//											--	empty lines allowed
//	SF:<path to the source file>			--	section per file, this is the section start
//	...										--	omitting the AST related knowledge of functions and branches (FN, FNDA, FNF, FNH, BRDA, BRF, BRH)
//	DA:<line number>,<execution count>		--	this is mostly the body of the coverage
//	DA:50,3
//	DA:52,0
//	...
//	LF:<total of coverable lines>			--	these 2 summarizing lines should come at the end of the section
//	LH:<total of hit lines>
//	end_of_record							--	designates end of section

// let inputStructureExample = {
// 	tests: [
// 		{
// 			testName: 'some full test name',
// 			coverage: {
// 				files: [
// 					{
// 						url: './some/full/path/to/file.js',
//						functions: [
//							...	
//						],
//						ranges: [
//							...	
//						],
// 						lines: [
// 							{number: 1, beg: 12, end: 25, hits: 5, ranges: [ { beg: 12, end: 15, hits: 0 }, { beg: 15, end: 25, hits: 5 } ]},
// 							{ ... },
// 						]
// 					}
// 				]
// 			}
// 		}
// 	]
// };

import { EOL } from 'node:os';
import { calcRangeCoverage } from '../model/range-utils.js';

export default {
	convert
};

/**
 * receives a set of coverage data and coverts it to the lcov text
 * - expects to receive the full and self-contained set of data
 * 
 * @param {Array} testCoverages coverage data in `just-test` structure
 */
function convert({ testCoverages, fileCoverages }) {
	const testsReport = convertTestCoverages(testCoverages);
	const filesReport = convertFileCoverages(fileCoverages);

	return [testsReport, filesReport].join(EOL);
}

function convertTestCoverages(testCoverages) {
	const result = [];
	for (const testCoverage of testCoverages) {
		if (!testCoverage.coverage || !Array.isArray(testCoverage.coverage) || !testCoverage.coverage.length) {
			continue;
		}

		//	test name
		let testReport = `TN:${testCoverage.testId}${EOL}`;

		//	files
		for (const fileCov of testCoverage.coverage) {
			//	file name
			testReport += `SF:${fileCov.url}${EOL}`;

			//	lines
			let allLinesHit = 0;
			for (const lineCov of fileCov.lines) {
				const lineHitsMax = calcRangeCoverage(lineCov, fileCov.ranges).max;
				testReport += `DA:${lineCov.number},${lineHitsMax}${EOL}`;
				allLinesHit += lineHitsMax > 0 ? 1 : 0;
			}

			testReport += `LF:${fileCov.lines.length}${EOL}`;
			testReport += `LH:${allLinesHit}${EOL}`;
			testReport += `end_of_record${EOL}${EOL}`;
		}

		//	end of record
		result.push(testReport);
	}
	return result.join(EOL);
}

function convertFileCoverages(fileCoverages) {
	const result = [];
	for (const fileCoverage of fileCoverages) {
		//	file name
		let fileReport = `SF:${fileCoverage.url}${EOL}`;

		//	lines
		let allLinesHit = 0;
		for (const lineCov of fileCoverage.lines) {
			const lineHitsMax = calcRangeCoverage(lineCov, fileCoverage.ranges).max;
			fileReport += `DA:${lineCov.number},${lineHitsMax}${EOL}`;
			allLinesHit += lineHitsMax > 0 ? 1 : 0;
		}

		fileReport += `LF:${fileCoverage.lines.length}${EOL}`;
		fileReport += `LH:${allLinesHit}${EOL}`;
		fileReport += `end_of_record${EOL}${EOL}`;

		//	end of record
		result.push(fileReport);
	}
	return result.join(EOL);
}
