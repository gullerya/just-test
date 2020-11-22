import fs from 'fs';
import Logger from '../logger/logger.js';
import buildConfig from './coverage-configurer.js';
import RangeCov from './range-cov.js';
import LineCov from './line-cov.js';
import FileCov from './file-cov.js';
import coverageToLcov from './coverage-to-lcov.js';

export {
	getCoverageService
}

const
	logger = new Logger({ context: 'coverage' }),
	NATIVE_PAGE_KEY = Symbol('native.page'),
	IS_SUPPORTED_KEY = Symbol('native.coverage.supported'),
	IS_RUNNING_KEY = Symbol('coverage.tracking.running'),
	REPORTS_KEY = Symbol('coverage.reports');

let coverageServiceInstance;
class CoverageService {
	verifyEnrichConfig(coverageConfig, environment) {
		return buildConfig(coverageConfig, environment);
	}

	isCoverageSupported() {
		return this[IS_SUPPORTED_KEY];
	}

	async start(nativePage) {
		if (!nativePage) {
			throw new Error(`native page argument required, received '${nativePage}'`);
		}
		this[NATIVE_PAGE_KEY] = nativePage;
		this[IS_RUNNING_KEY] = false;
		this[IS_SUPPORTED_KEY] = Boolean(nativePage.coverage);

		if (this.isCoverageSupported()) {
			await this[NATIVE_PAGE_KEY].coverage.startJSCoverage();
			this[IS_RUNNING_KEY] = true;
			logger.info('coverage tracking started');
		} else {
			logger.warn('coverage is NOT supported on this env');
		}
	}

	async stop() {
		if (this.isCoverageSupported()) {
			this[REPORTS_KEY] = await this[NATIVE_PAGE_KEY].coverage.stopJSCoverage();
			this[IS_RUNNING_KEY] = false;
			logger.info('coverage tracking stopped');
		} else {
			logger.warn('coverage is NOT supported on this env');
		}
	}

	async report(covConf, reportPath) {
		if (!this.isCoverageSupported()) {
			logger.warn('coverage is NOT supported on this env');
			return;
		}
		if (this[IS_RUNNING_KEY]) {
			logger.error('coverage is still running, stop it first');
			return;
		}
		if (!this[REPORTS_KEY] || !this[REPORTS_KEY].length) {
			logger.info('no coverage reports found');
			return;
		}

		logger.info();
		logger.info('processing coverage data...');

		const
			jsCoverageReports = this[REPORTS_KEY],
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
					} else if (line.startsAfter(rangeCov)) {
						break;
					}
				}
			});

			fileCov.covered = fileCov.lines.reduce((a, c) => a + (c.isCoveredFull() || c.isCoveredPart() ? 1 : 0), 0) / fileCov.lines.length;
			logger.info(`... "${fileCov.path}"` + (entryURL.search ? ` (${entryURL.search})` : '') + `\t${Math.round(fileCov.covered * 100)}%`);

			//	TODO: use something like this in an HTML report generator
			fileCov.lines.forEach(l => {
				if (l.isCoveredPart()) {
					let s = '';
					l.covRanges.forEach(lcr => {
						if (lcr.hits) {
							s += '^' + fileCov.text.substring(lcr.beg, lcr.end) + '^';
						} else {
							s += fileCov.text.substring(lcr.beg, lcr.end);
						}
					});
					logger.log(s);
				}
			});

			covData.tests[0].coverage.files.push(fileCov);
		}

		//	produce report
		this.writeReport(covData, covConf, reportPath);

		logger.info(`... coverage report written ("${covConf.format}" format)`);
	}

	writeReport(data, conf, reportPath) {
		let report;
		switch (conf.format) {
			case 'lcov':
				report = coverageToLcov.convert(data);
				break;
			default:
				logger.error(`invalid coverage format "${conf.format}" required`);
				return;
		}
		if (report) {
			fs.writeFileSync(reportPath, report, { encoding: 'utf-8' });
		}
	}
}

function getCoverageService() {
	if (!coverageServiceInstance) {
		coverageServiceInstance = new CoverageService();
	}
	return coverageServiceInstance;
}