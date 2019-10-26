const
	os = require('os'),
	fs = require('fs'),
	path = require('path'),
	util = require('util'),
	fsExtra = require('fs-extra'),
	ARG_KEYS = ['--config'],
	DEFAULT_CONFIG = require('./default-config.json'),
	effectiveConf = {};

module.exports = {
	configuration: effectiveConf
};

const
	apargs = process.argv.slice(2),
	args = {};

//	collect arguments
apargs.forEach(arg => {
	const parts = arg.split('=');
	if (parts.length === 2 && ARG_KEYS.includes(parts[0])) {
		args[parts[0]] = parts[1];
	}
});

//	valid required
const configLocation = args['--config'];
if (!configLocation) {
	console.error('Error: missing or invalid argument "--config" (example: --config=/path/to/config.json)');
	process.exit(1);
}

console.info(os.EOL);
console.info('JustTest: started, execution directory "' + process.cwd() + '"');
console.info('JustTest: execution arguments collected as following');
console.info(util.inspect(args, false, null, true));
console.info(os.EOL);
console.info('JustTest: building effective configuration...');

//	read configuration
let rawConfiguration;
try {
	rawConfiguration = fs.readFileSync(configLocation, { encoding: 'utf8' });
} catch (e) {
	console.error('Error: failed to READ configuration', e);
	process.exit(1);
}

//	parse configuration and merge with defaults
let configuration;
try {
	configuration = JSON.parse(rawConfiguration);
} catch (e) {
	console.error('Error: failed to PARSE configuration', e);
	process.exit(1);
}
buildEffectiveConfiguration(configuration);

//	validate configuration essentials
validateEffectiveConf();

//	print out effective configuration
console.info('JustTest: ... effective configuration to be used is as following');
console.info(util.inspect(effectiveConf, false, null, true));
console.info(os.EOL);

function buildEffectiveConfiguration(inputConfig) {
	if (!inputConfig || typeof inputConfig !== 'object') {
		throw new Error('invalid input config');
	}

	//	TODO: currenctly runs on top level object hierarchy only, in future might be need to turn it to deep merge
	Object.keys(DEFAULT_CONFIG).forEach(partKey => {
		effectiveConf[partKey] = Object.assign({}, DEFAULT_CONFIG[partKey], inputConfig[partKey]);
	});
}

function validateEffectiveConf() {
	try {
		validateServerConf(effectiveConf.server);
		validateTestsConf(effectiveConf.tests);
		validateCoverageConf(effectiveConf.coverage);
		validateReportsFolder(effectiveConf.reports);
	} catch (e) {
		console.error('Error: invalid configuration', e);
		process.exit(1);
	}
}

function validateServerConf(sc) {
	if (!sc) {
		throw new Error('AUT "server" configuration part is missing');
	}

	if (sc.local) {
		if (!sc.port) {
			throw new Error('AUT "server" said to be local but "port" is missing');
		}
		if (!sc.resourcesFolder) {
			throw new Error('AUT "server" said to be local but "resoucesFolder" is missing');
		}
		const fullResourcesPath = path.resolve(process.cwd(), sc.resourcesFolder);
		if (!fs.existsSync(fullResourcesPath) || !fs.lstatSync(fullResourcesPath).isDirectory()) {
			throw new Error('AUT "server" said to be local but specified "resoucesFolder" ("' + sc.resourcesFolder + '") not exists or not a directory');
		}
	}

	if (!sc.local) {
		if (!sc.remoteUrl) {
			throw new Error('AUT "server" said to be remote but "remoteUrl" is missing');
		}
	}
}

function validateTestsConf(tc) {
	if (!tc) {
		throw new Error('"tests" configuration part is missing');
	}
	if (!tc.url) {
		throw new Error('"tests" configuration is missing "url" part');
	}
}

function validateCoverageConf(cc) {
	const coverageFormats = ['lcov'];
	if (!cc) {
		throw new Error('"coverage" configuration part is missing');
	}
	if (cc.skip) {
		return;
	}
	if (!coverageFormats.includes(cc.format)) {
		throw new Error('"coverage" configuration has invalid "format": ' + cc.format + '; supported formats are: ' + coverageFormats);
	}
}

function validateReportsFolder(rc) {
	if (!rc) {
		throw new Error('"reports" configuration part is missing');
	}
	if (!rc.folder) {
		throw new Error('"reports" configuration is missing "folder" part');
	}
	const reportsFolderPath = path.resolve(process.cwd(), rc.folder);
	fsExtra.emptyDirSync(reportsFolderPath);
	console.info('JustTest: reports folder resolve to and initialized in "' + reportsFolderPath + '"');
}