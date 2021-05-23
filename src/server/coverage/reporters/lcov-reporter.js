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
// 						path: '/some/full/path/to/file.js',
// 						lines: [
// 							{number: 1, beg: 12, end: 25, covRanges: [ { beg: 12, end: 15, hits: 0 }, { beg: 15, end: 25, hits: 5 } ]},
// 							{ ... },
// 						]
// 					}
// 				]
// 			}
// 		}
// 	]
// };

import os from 'os';

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
	coverageData.forEach(test => {
		//	test name
		let testReport = `TN:${test.id}${os.EOL}`;

		//	files
		test.coverage.forEach(file => {
			//	file name
			testReport += `SF:${file.url}${os.EOL}`;

			//	lines
			let hitLines = 0;
			file.lines.forEach(lineCov => {
				const lineHitsMax = lineCov.covRanges.reduce((a, c) => Math.max(a, c.hits), 0);
				testReport += `DA:${lineCov.number},${lineHitsMax}${os.EOL}`;
				hitLines += lineHitsMax > 0 ? 1 : 0;
			});

			testReport += `LF:${file.lines.length}${os.EOL}`;
			testReport += `LH:${hitLines}${os.EOL}`;
			testReport += `end_of_record${os.EOL}${os.EOL}`;
		});

		//	end of record
		testReports.push(testReport);
	});

	return testReports.join(os.EOL + os.EOL + os.EOL);
}
