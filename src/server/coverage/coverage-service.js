// import fs from 'fs';
import Logger from '../logger/logger.js';
import { P } from '../../common/performance-utils.js';
import buildConfig from './coverage-configurer.js';
import LineCov from '../../common/models/coverage/line-cov.js';
import FileCov from '../../common/models/coverage/file-cov.js';
import processV8ScriptCoverage from './converters/v8-coverage-converter.js';
import lcovReporter from './reporters/lcov-reporter.js';
import glob from 'glob';

export {
	collectTargetSources,
	lcovReporter,
	verifyEnrichConfig,
	processV8ScriptCoverage
}

const
	logger = new Logger({ context: 'coverage' }),
	REPORTS_KEY = Symbol('coverage.reports');

/**
 * process, validate and enrich by defaults the provided configuration
 * - provided environment is taken into consideration
 */
function verifyEnrichConfig(coverageConfig, environment) {
	return buildConfig(coverageConfig, environment);
}

async function collectTargetSources(config) {
	if (!config || !config.include) {
		return [];
	}

	logger.info('collecting coverage targets...');
	const
		started = P.now(),
		options = { nodir: true, nosort: true, ignore: config.exclude },
		promises = [];
	for (const i of config.include) {
		promises.push(new Promise(resolve => {
			glob(i, options, (err, matches) => {
				if (err) {
					logger.error(`failed to collect coverage targets from '${i}': ${err}`);
					resolve([]);
				} else {
					resolve(matches);
				}
			})
		}));
	}
	const result = (await Promise.all(promises)).reduce((a, c) => {
		a.push(...c);
		return a;
	}, []);
	logger.info(`... collected ${result.length} coverage targets (${(P.now() - started).toFixed(1)}ms)`);
	return result;
}

async function report(covConf, reportPath) {
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
				l.ranges.forEach(lcr => {
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
}