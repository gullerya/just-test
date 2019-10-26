const
	os = require('os'),
	fsExtra = require('fs-extra'),
	coverageToLcov = require('./coverage-to-lcov');

module.exports = {
	start: start,
	report: report
};

async function start(nativePage) {
	return nativePage.coverage.startJSCoverage();
}

async function report(nativePage, covConf, reportPath, serverUrl) {
	const
		jsCoverage = await nativePage.coverage.stopJSCoverage(),
		covData = {
			tests: [{
				testName: 'anonymous.anonymous',
				coverage: {
					files: []
				}
			}]
		};
	for (const entry of jsCoverage) {
		if (entry.url.endsWith('.min.js')) {
			continue;
		}

		const fileCoverage = {
			path: entry.url.replace(serverUrl, ''),
			lines: {},
			ranges: []
		};

		console.info('JustTest [coverager]: processing "' + fileCoverage.path + '"');

		//	existing ranges are a COVERED sections
		//	ranges' in-between parts are a NON-COVERED sections
		let positionInCode = 0,
			currentLine = 1;
		entry.ranges.forEach(range => {
			fileCoverage.ranges.push(range);

			//	handle missed section
			if (range.start > positionInCode) {
				const missedCode = entry.text.substring(positionInCode, range.start);
				if (missedCode.indexOf(os.EOL) >= 0) {
					const missedLines = missedCode.split(os.EOL);
					missedLines.forEach(line => {
						if (!/^\s*$/.test(line) && (!fileCoverage.lines[currentLine] || !fileCoverage.lines[currentLine].hits)) {
							fileCoverage.lines[currentLine] = { hits: 0 };
						}
						currentLine++;
					});
					currentLine--;
				} else {
					if (!fileCoverage.lines[currentLine] && !/^\s*$/.test(missedCode)) {
						fileCoverage.lines[currentLine] = { hits: 0 };
					}
				}
			}

			//	handle covered section
			const hitCode = entry.text.substring(range.start, range.end);
			if (hitCode.indexOf(os.EOL) >= 0) {
				const hitLines = hitCode.split(os.EOL);
				if (hitLines[0] === '') {
					hitLines.shift();
					currentLine++;
				}
				hitLines.forEach(line => {
					if (!/^\s*$/.test(line)) {
						fileCoverage.lines[currentLine] = { hits: 1 };
					}
					currentLine++;
				});
				currentLine--;
			} else {
				fileCoverage.lines[currentLine].hits++;
			}

			positionInCode = range.end;
		});
		covData.tests[0].coverage.files.push(fileCoverage);
	}

	//	produce report
	writeReport(covData, covConf, reportPath);
}

function writeReport(data, conf, reportPath) {
	let report;
	switch (conf.format) {
		case 'lcov':
			report = coverageToLcov.convert(data);
			break;
		default:
			console.error('JustTest: invalid coverage format "' + conf.format + '" required');
			return;
	}
	fsExtra.outputFileSync(reportPath, report);
}