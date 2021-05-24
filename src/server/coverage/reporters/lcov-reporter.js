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

import os from 'os';
import { calcRangeCoverage } from '../../../common/models/coverage/range-utils.js';

export default {
	convert
};

/**
 * receives a set of coverage data and coverts it to the lcov text
 * 
 * @param {object} coverageData coverage data in `just-test` format
 */
function convert(coverageData) {
	const testReports = [];

	for (const test of coverageData) {
		//	test name
		let testReport = `TN:${test.id}${os.EOL}`;

		//	files
		for (const fileCov of test.coverage) {
			//	file name
			testReport += `SF:${fileCov.url}${os.EOL}`;

			//	lines
			let allLinesHit = 0;
			for (const lineCov of fileCov.lines) {
				const lineHitsMax = calcRangeCoverage(lineCov, fileCov.ranges).max;
				testReport += `DA:${lineCov.number},${lineHitsMax}${os.EOL}`;
				allLinesHit += lineHitsMax > 0 ? 1 : 0;
			}

			testReport += `LF:${fileCov.lines.length}${os.EOL}`;
			testReport += `LH:${allLinesHit}${os.EOL}`;
			testReport += `end_of_record${os.EOL}${os.EOL}`;
		}

		//	end of record
		testReports.push(testReport);
	}

	return testReports.join(os.EOL + os.EOL + os.EOL);
}
