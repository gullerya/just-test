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
// 							{number: 1, hits: 0},
// 							{number: 2, hits: 2},
// 							{number: 3, hits: 1}
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

function convert(coverageData) {
	const verficationError = verifyCoverageData(coverageData);
	if (verficationError) {
		console.error(verficationError);
		return null;
	}

	const testReports = [];
	coverageData.tests.forEach(test => {
		//	test name
		let testReport = 'TN:' + test.testName + os.EOL + os.EOL;

		//	files
		test.coverage.files.forEach(file => {
			//	file name
			testReport += 'SF:' + file.path + os.EOL;

			//	lines
			let coverableLines = 0,
				hitLines = 0;
			file.lines.forEach(lineCov => {
				testReport += 'DA:' + lineCov.number + ',' + lineCov.rangeCovs.reduce((a, c) => Math.max(a, c.hits), 0) + os.EOL;
				coverableLines++;
				hitLines += lineCov.hits > 0 ? 1 : 0;
			});

			testReport += 'LF:' + coverableLines + os.EOL;
			testReport += 'LH:' + hitLines + os.EOL;
			testReport += 'end_of_record' + os.EOL;
		});

		//	end of record
		testReport += 'end_of_record';
		testReports.push(testReport);
	});

	return testReports.join(os.EOL + os.EOL + os.EOL);
}

function verifyCoverageData(coverageData) {
	if (!coverageData || typeof coverageData !== 'object' ||
		!Array.isArray(coverageData.tests) || !coverageData.tests.length ||
		coverageData.tests.some(test => !test.testName || !/^[a-zA-Z._]+$/.test(test.testName) ||
			!test.coverage || !Array.isArray(test.coverage.files) || !test.coverage.files.length)
	) {
		return 'coverage data is corrupted or incomplete';
	} else {
		return null;
	}
}