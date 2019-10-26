const
	path = require('path'),
	fsExtra = require('fs-extra'),
	coverageToLcov = require('./coverage-to-lcov');

module.exports = {
	start: start,
	report: report
};

async function start(nativePage) {
	return nativePage.coverage.startJSCoverage();
}

async function report(nativePage, covConf, reportsFolder, serverUrl) {
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
		if (!sourceRelevant()) {
			continue;
		}

		let fileCoverage = {
			path: entry.url.replace(serverUrl, ''),
			lines: {},
			ranges: []
		};

		//	existing ranges are a COVERED sections
		//	ranges' in-between parts are a NON-COVERED sections
		let positionInCode = 0,
			currentLine = 1;
		entry.ranges.forEach(range => {
			fileCoverage.ranges.push(range);

			//	handle missed section
			if (range.start > positionInCode) {
				let missedCode = entry.text.substring(positionInCode, range.start);
				if (missedCode.indexOf(os.EOL) >= 0) {
					let missedLines = missedCode.split(os.EOL);
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
			let hitCode = entry.text.substring(range.start, range.end);
			if (hitCode.indexOf(os.EOL) >= 0) {
				let hitLines = hitCode.split(os.EOL);
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
	writeReport(covData, reportsFolder, covConf.format);
}

function writeReport(covData, folder, format) {
	switch (format) {
		case 'lcov':
			const lcov = coverageToLcov.convert(covData);
			fsExtra.outputFileSync(path.resolve(folder, 'coverage.lcov'), lcov);
			break;
		default:
			console.error('JustTest: invalid coverage format "' + covConf.format + '" required');
	}
}