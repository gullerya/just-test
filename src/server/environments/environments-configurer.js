import Logger from '../logger/logger.js';

const
	logger = new Logger({ context: 'environment configurer' }),
	ENVIRONMENT_BLUEPRINT = Object.freeze({
		interactive: null,
		browser: null,
		node: null,
		tests: null,
		coverage: null
	}),
	PRINCIPAL_ENTRIES = ['interactive', 'browser', 'node'],
	BROWSER_TYPES = ['chromium', 'firefox', 'webkit'],
	BROWSER_EXECUTORS = ['iframe', 'page', 'worker'],
	SCHEMES = ['light', 'dark'],
	DEFAULT_BROWSER_EXECUTORS = {
		type: 'iframe'
	},
	DEFAULT_BROWSER_IMPORTS = {
		'@gullerya/just-test': '/libs/@gullerya/just-test/bin/runner/just-test.js',
		'@gullerya/just-test/assert': '/libs/@gullerya/just-test/bin/common/assert-utils.js'
	};

export default environment => {
	validateEnvironment(environment);

	const result = {};
	try {
		if (environment.browser) {
			result.browser = processBrowser(environment.browser);
		} else if (environment.interactive) {
			result.interactive = processInteractive(environment.interactive);
		} else if (environment.node) {
			result.node = processNode(environment.node);
		}
	} catch (e) {
		logger.error(e);
		throw new Error(`environment configuration failed; violator: ${JSON.stringify(environment)}`);
	}

	return result;
};

function processBrowser(b) {
	validateBrowser(b);
	return b;
}

function processInteractive(i) {
	validateInteractive(i);
	return true;
}

function processNode(n) {
	validateNode(n);
	return true;
}

function validateEnvironment(e) {
	//	no foreign entries
	for (const key in e) {
		if (!(key in ENVIRONMENT_BLUEPRINT)) {
			throw new Error(`invalid entry '${key}' in environment definition`);
		}
	}

	//	interactive/browser/node are mutually exclusive, at least one is required
	let principalCounter = 0;
	for (const pe of PRINCIPAL_ENTRIES) {
		if (e[pe]) { principalCounter++; }
	}
	if (principalCounter !== 1) {
		throw new Error(`enviroment MUST have one and only one of those [${PRINCIPAL_ENTRIES.join(',')}]`);
	}
}

function validateBrowser(b) {
	//	browser should be an object
	if (typeof b !== 'object') {
		throw new Error(`browser, if/when defined, MUST be an object`);
	}

	//	browser should have a type defined
	if (!BROWSER_TYPES.includes(b.type)) {
		throw new Error(`browser MUST define one of the supported types [${BROWSER_TYPES.join(',')}]`);
	}

	//	browser should have an executor defined
	if (b.executors && typeof b.executors !== 'object') {
		throw new Error(`executors MUST be defined for the browser`);
	}
	if (!b.executors) {
		b.executors = DEFAULT_BROWSER_EXECUTORS;
	}
	if (!BROWSER_EXECUTORS.includes(b.executors.type)) {
		throw new Error(`executor MUST define one of the supported types [${BROWSER_EXECUTORS.join(',')}]`);
	}

	//	scheme should be valid, if any
	if (b.scheme && !SCHEMES.includes(b.scheme)) {
		throw new Error(`scheme MUST be one of the supported ones [${SCHEMES.join(',')}]`);
	}

	//	importmap
	if (b.importmap && (typeof b.importmap !== 'object' || typeof b.importmap.imports !== 'object')) {
		throw new Error(`importmap, if/when defined, MUST be a valid importmap object`);
	}
	const imports = Object.assign({}, DEFAULT_BROWSER_IMPORTS, b.importmap?.imports);
	b.importmap = { imports };
}

function validateInteractive(i) {
	if (typeof i !== 'boolean') {
		throw new Error(`interactive, if/when defined, MUST be a boolean`);
	}
}

function validateNode(n) {
	if (typeof n !== 'boolean') {
		throw new Error(`node environment, if/when defined, MUST be a boolean`);
	}
}