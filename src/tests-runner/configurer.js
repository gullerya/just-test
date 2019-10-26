const
	os = require('os'),
	fs = require('fs'),
	util = require('util'),
	ARG_KEYS = ['--config'],
	DEFAULT_CONFIG = require('./default-config.json'),
	effectiveConfig = {};

module.exports = {
	configuration: effectiveConfig
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
	process.exit(-1);
}

//	read configuration
let rawConfiguration;
try {
	rawConfiguration = fs.readFileSync(configLocation, { encoding: 'utf8' });
} catch (e) {
	console.error('Error: failed to READ configuration', e);
	process.exit(-1);
}

//	parse configuration and merge with defaults
let configuration;
try {
	configuration = JSON.parse(rawConfiguration);
} catch (e) {
	console.error('Error: failed to PARSE configuration', e);
	process.exit(-1);
}
buildEffectiveConfiguration(configuration);

//	validate configuration essentials
validateEffectiveConfiguration();

//	print out effective configuration
console.info(os.EOL);
console.info('JustTest: effective configuration to be used is as following');
console.info(util.inspect(effectiveConfig, false, null, true));
console.info(os.EOL);

function buildEffectiveConfiguration(inputConfig) {
	if (!inputConfig || typeof inputConfig !== 'object') {
		throw new Error('invalid input config');
	}
	//	TODO: should be recursive and deep, for now will completely override top tevel sections
	Object.assign(effectiveConfig, {
		server: Object.assign({}, DEFAULT_CONFIG.server, inputConfig.server),
		tests: Object.assign({}, DEFAULT_CONFIG.tests, inputConfig.tests),
		coverage: Object.assign({}, DEFAULT_CONFIG.coverage, inputConfig.coverage)
	});
}

function validateEffectiveConfiguration() {
	try {
		validateServerConfiguration(effectiveConfig.server);
		validateTestsConfiuration(effectiveConfig.tests);
		validateCoverageConfiguration(effectiveConfig.coverage);
	} catch (e) {
		console.error('Error: invalid configuration', e);
		process.exit(-1);
	}
}

function validateServerConfiguration(sc) {
	if (!sc) {
		throw new Error('AUT "server" configuration part is missing');
	}
	if (sc.local && !sc.port) {
		throw new Error('AUT "server" said to be local but "port" is missing');
	}
	if (!sc.local && !sc.url) {
		throw new Error('AUT "server" said to be remove but "url" is missing');
	}
}

function validateTestsConfiuration(tc) {
	if (!tc) {
		throw new Error('"tests" configuration part is missing');
	}
	if (!tc.starter) {
		throw new Error('"tests" configuration is missing "starter" part');
	}
}

function validateCoverageConfiguration(cc) {
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