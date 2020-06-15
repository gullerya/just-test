import fs from 'fs';
// import path from 'path';
import util from 'util';
// import fsExtra from 'fs-extra';
// import playwright from 'playwright';
import Logger from './server/logging/logger.js';

const logger = new Logger('JustTest [configurer]');
// browserTypes = Object.freeze({ chromium: 'chromium', firefox: 'firefox', webkit: 'webkit' }),
// testResultsFormats = Object.freeze(['xUnit']);

export {
	resolveGivenConfig,
	mergeConfig
	// getBrowserRunner
};

function resolveGivenConfig(clargs) {
	const args = {};

	//	collect arguments
	clargs.forEach(arg => {
		const parts = arg.split('=');
		if (parts.length === 2) {
			args[parts[0]] = parts[1];
		}
	});

	//	valid required
	const configLocation = args['-c'];
	if (!configLocation) {
		logger.error('missing or invalid argument "-c" (example: -c=/path/to/config.json)');
		process.exit(1);
	}

	logger.info('initializing configuration');
	logger.info('execution directory "' + process.cwd() + '"');
	logger.info('execution arguments collected as following');
	logger.info(util.inspect(args, false, null, true));
	logger.info();
	logger.info('building effective configuration...');

	//	read configuration
	let rawConfiguration;
	try {
		rawConfiguration = fs.readFileSync(configLocation, { encoding: 'utf8' });
	} catch (e) {
		logger.error('failed to READ configuration', e);
		process.exit(1);
	}

	//	parse configuration and merge with defaults
	let configuration;
	try {
		configuration = JSON.parse(rawConfiguration);
		Object.keys(args).forEach(aKey => {
			if (aKey.indexOf('-') !== 0) {
				const ckPath = aKey.split('.');
				let target = configuration;
				for (let i = 0, l = ckPath.length - 1; i < l; i++) {
					const nextPNode = ckPath[i];
					if (target[nextPNode] && typeof target[nextPNode] === 'object') {
						target = target[nextPNode];
					} else if (target[nextPNode] === undefined || target[nextPNode] === null) {
						target = target[nextPNode] = {};
					} else {
						throw new Error(`command line config property '${aKey}' conflicts with file config property '${nextPNode}' which value is '${target[nextPNode]}'`);
					}
				}
				//	TODO: add support for a complex values, as of now threated as strings only
				target[ckPath[ckPath.length - 1]] = args[aKey];
			}
		});
	} catch (e) {
		logger.error('failed to PARSE configuration', e);
		process.exit(1);
	}

	//	print out effective configuration
	// logger.info('... effective configuration to be used is as following');
	// logger.info(util.inspect(effectiveConf, false, null, true));
	// logger.info();
}

function mergeConfig(a, b) {
	if (typeof a !== 'object' || typeof b !== 'object') {
		throw new Error('merged graphs MUST be an objects');
	}

	let result;
	if (b === null) {
		result = null;									//	null returned AS IS
	} else if (Array.isArray(a)) {
		result = b;										//	arrays are taken AS IS
	} else {
		Object.keys(a).forEach(k => {
			if (b.hasOwnProperty(k)) {					//	each existing property of 'b' to be taken
				if (typeof a[k] === 'object') {
					result[k] = mergeConfig(a[k], b[k]);		//	objects are recursively merged
				} else {
					result[k] = b[k];					//	plain data just copied
				}
			} else {
				result = a[k];							//	when 'b' doesn't has property - keep the default of 'a'
			}
		});
	}
	return result;
};

// function validateBrowserConf(bc) {
// 	if (!bc) {
// 		throw new Error('"browser" configuration part is missing');
// 	}

// 	if (!bc.type) {
// 		throw new Error('"browser" configuration is missing "type" part');
// 	}
// 	if (!Object.keys(browserTypes).includes(bc.type)) {
// 		throw new Error(`"type" of "browser" is not a one of the supported ones(${Object.keys(browserTypes).join(', ')})`);
// 	}
// }

// function validateTestsConf(tc) {
// 	if (!tc) {
// 		throw new Error('"tests" configuration part is missing');
// 	}
// 	if (!tc.url) {
// 		throw new Error('"tests" configuration is missing "url" part');
// 	}
// 	if (typeof tc.maxFail !== 'number') {
// 		throw new Error('"maxFail" configuration of "tests" is not a number');
// 	}
// 	if (typeof tc.maxSkip !== 'number') {
// 		throw new Error('"maxSkip" configuration of "tests" is not a number');
// 	}
// 	if (!testResultsFormats.includes(tc.format)) {
// 		throw new Error('invalid "format" configuration of "tests": ' + tc.format + '; supported formats are: ' + testResultsFormats);
// 	}
// 	if (!tc.reportFilename) {
// 		throw new Error('"tests" configuration is missing "reportFilename" part');
// 	}
// }

// function validateReportsFolder(rc) {
// 	if (!rc) {
// 		throw new Error('"reports" configuration part is missing');
// 	}
// 	if (!rc.folder) {
// 		throw new Error('"reports" configuration is missing "folder" part');
// 	}
// 	const reportsFolderPath = path.resolve(process.cwd(), rc.folder);
// 	fsExtra.emptyDirSync(reportsFolderPath);
// 	logger.info('reports folder resolve to and initialized in "' + reportsFolderPath + '"');
// }

// async function getBrowserRunner() {
// 	const browserRunner = playwright[effectiveConf.browser.type];
// 	if (!browserRunner) {
// 		throw new Error(`failed to resolve browser runner '${effectiveConf.browser.type}'`);
// 	}
// 	return browserRunner;
// }