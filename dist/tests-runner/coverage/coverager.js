const
	os = require('os'),
	{ URL } = require('url'),
	fsExtra = require('fs-extra'),
	coverageToLcov = require('./coverage-to-lcov');

let nativeCoverageSupported = false;

module.exports = {
	start: start,
	report: report
};

async function start(nativePage) {
	if (nativePage.coverage) {
		nativeCoverageSupported = true;
		await nativePage.coverage.startJSCoverage();
		console.info('JustTest [coverager]: coverage collection started');
		return true;
	} else {
		console.warn('JustTest [coverager]: coverage is NOT supported on this env');
		return false;
	}
}

async function report(nativePage, covConf, reportPath) {
	if (!nativeCoverageSupported) {
		return;
	}

	console.info(os.EOL);
	console.info('JustTest [coverager]: processing coverage data...');

	const
		jsCoverageReports = await nativePage.coverage.stopJSCoverage(),
		covData = {
			tests: [{
				testName: 'anonymous.anonymous',
				coverage: {
					files: []
				}
			}]
		};
	for (const entry of jsCoverageReports) {
		const
			entryURL = new URL(entry.url),
			relFilePath = entryURL.pathname;

		//	pass through include - white list
		if (Array.isArray(covConf.include) && !covConf.include.some(one => one.test(relFilePath))) {
			continue;
		}
		//	pass through exclude - black list
		if (Array.isArray(covConf.exclude) && covConf.exclude.some(one => one.test(relFilePath))) {
			continue;
		}

		//	create file coverage DTO, but first lookup for an already existing one (query params case)
		let fileCoverage = covData.tests[0].coverage.files.find(f => f.path === relFilePath);
		if (!fileCoverage) {
			fileCoverage = {
				path: relFilePath,
				lines: {},
				ranges: []
			};

			//	set lines with ranges
			const lineSepLocations = entry.source.matchAll(/[\r\n]{1,2}/gm);
			let currentPosition = 0,
				lineCounter = 1;
			for (const lineSepLocation of lineSepLocations) {
				fileCoverage.lines[lineCounter] = { start: currentPosition, end: lineSepLocation.index, hits: 0 };
				currentPosition = lineSepLocation.index + lineSepLocation[0].length;
				lineCounter++;
			}
			fileCoverage.lines[lineCounter] = { start: currentPosition, end: entry.source.length, hits: 0 };
		}

		process.stdout.write(`JustTest [coverager]: ... "${fileCoverage.path}"` + (entryURL.search ? ` (${entryURL.search})` : ''));

		let positionInCode = 0,
			currentLine = 1;

		//	order all ranges accross the functions
		entry.functions.forEach(f => {
			f.ranges.forEach(r => {
				const found = fileCoverage.ranges.some((tr, ti, ta) => {
					if (r.startOffset < tr.startOffset) {
						ta.splice(ti, 0, r);
						return true;
					} else {
						return false;
					}
				});
				if (!found) {
					fileCoverage.ranges.push(r);
				}
			});
		});

		//	apply ranges to lines
		fileCoverage.ranges.forEach(r => {
			for (const [ln, l] of Object.entries(fileCoverage.lines)) {
				if (l.start >= r.startOffset && l.end <= r.endOffset) {
					l.hits = r.count;
				} else if ((l.start >= r.startOffset && l.start <= r.endOffset) || (l.end >= r.startOffset && l.end <= r.endOffset)) {
					l.hits = r.count;
					console.debug(`line ${ln} got partial hit`);
				} else if (l.startOffset >= r.endOffset) {
					break;
				}
			}
		});

		// entry.ranges.forEach(range => {
		// 	fileCoverage.ranges.push(range);

		// 	//	handle missed section
		// 	if (range.start > positionInCode) {
		// 		const missedCode = entry.text.substring(positionInCode, range.start);
		// 		if (missedCode.indexOf(os.EOL) >= 0) {
		// 			const missedLines = missedCode.split(os.EOL);
		// 			missedLines.forEach(line => {
		// 				if (!/^\s*$/.test(line) && (!fileCoverage.lines[currentLine] || !fileCoverage.lines[currentLine].hits)) {
		// 					fileCoverage.lines[currentLine] = { hits: 0 };
		// 				}
		// 				currentLine++;
		// 			});
		// 			currentLine--;
		// 		} else {
		// 			if (!fileCoverage.lines[currentLine] && !/^\s*$/.test(missedCode)) {
		// 				fileCoverage.lines[currentLine] = { hits: 0 };
		// 			}
		// 		}
		// 	}

		// 	//	handle covered section
		// 	const hitCode = entry.text.substring(range.start, range.end);
		// 	if (hitCode.indexOf(os.EOL) >= 0) {
		// 		const hitLines = hitCode.split(os.EOL);
		// 		if (hitLines[0] === '') {
		// 			hitLines.shift();
		// 			currentLine++;
		// 		}
		// 		hitLines.forEach(line => {
		// 			if (!/^\s*$/.test(line)) {
		// 				fileCoverage.lines[currentLine] = { hits: 1 };
		// 			}
		// 			currentLine++;
		// 		});
		// 		currentLine--;
		// 	} else {
		// 		fileCoverage.lines[currentLine].hits++;
		// 	}

		// 	positionInCode = range.end;
		// });

		const lk = Object.keys(fileCoverage.lines);
		fileCoverage.covered = lk.reduce((pv, cv) => pv + (fileCoverage.lines[cv].hits ? 1 : 0), 0) / lk.length;
		process.stdout.write('\t'.repeat(2) + Math.round(fileCoverage.covered * 100) + '%' + os.EOL);

		covData.tests[0].coverage.files.push(fileCoverage);
	}

	//	produce report
	writeReport(covData, covConf, reportPath);

	console.info(`JustTest [coverager]: ... coverage report written ("${covConf.format}" format)`);
}

function writeReport(data, conf, reportPath) {
	let report;
	switch (conf.format) {
		case 'lcov':
			report = coverageToLcov.convert(data);
			break;
		default:
			console.error(`JustTest [coverager]: invalid coverage format "${conf.format}" required`);
			return;
	}
	if (report) {
		fsExtra.outputFileSync(reportPath, report);
	}
}