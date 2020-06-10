import os from 'os';
import { URL } from 'url';
import fsExtra from 'fs-extra';
import RangeCov from './range-cov.js';
import LineCov from './line-cov.js';
import FileCov from './file-cov.js';
import coverageToLcov from './coverage-to-lcov.js';

let nativeCoverageSupported = false;

export default {
	start,
	report
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

		//	create file coverage DTO, but first lookup for an already existing one (query params case, same code fetched twice)
		let fileCov = covData.tests[0].coverage.files.find(f => f.path === relFilePath);
		if (!fileCov) {
			fileCov = new FileCov(relFilePath, entry.source);

			//	setup lines from source
			const eolPoses = fileCov.text.matchAll(/[\r\n]{1,2}/gm);
			let indexPos = 0,
				linePos = 1;
			//	all lines but last
			for (const eolPos of eolPoses) {
				if (eolPos.index > indexPos) {		//	otherwise it's an empty line
					fileCov.lines.push(new LineCov(linePos, indexPos, eolPos.index));
				}
				indexPos = eolPos.index + eolPos[0].length;
				linePos++;
			}
			//	last line
			if (entry.source.length > indexPos) {
				fileCov.lines.push(new LineCov(linePos, indexPos, entry.source.length));
			}
		}

		process.stdout.write(`JustTest [coverager]: ... "${fileCov.path}"` + (entryURL.search ? ` (${entryURL.search})` : ''));

		//	order all ranges accross the functions
		entry.functions.forEach(f => {
			f.ranges.forEach(r => {
				const jtr = new RangeCov(r.startOffset, r.endOffset, r.count);
				const added = fileCov.ranges.some((tr, ti, ta) => {
					if (jtr.startsBefore(tr)) {
						ta.splice(ti, 0, jtr);
						return true;
					} else {
						return false;
					}
				});
				if (!added) {
					fileCov.ranges.push(jtr);
				}
			});
		});

		//	apply ranges to lines
		fileCov.ranges.forEach(rangeCov => {
			for (let i = 0, l = fileCov.lines.length; i < l; i++) {
				const line = fileCov.lines[i];
				if (rangeCov.overlaps(line)) {
					line.addRangeCov(rangeCov);
				} else if (rangeCov.startsAfter(line)) {
					break;
				}
			}
		});

		fileCov.covered = fileCov.lines.reduce((a, c) => a + (c.isCoveredFull() ? 1 : 0), 0) / fileCov.lines.length;
		process.stdout.write('\t'.repeat(2) + Math.round(fileCov.covered * 100) + '%' + os.EOL);

		covData.tests[0].coverage.files.push(fileCov);
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