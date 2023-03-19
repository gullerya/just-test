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
	SCHEMES = ['light', 'dark'];

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
	//	browsers should be an non-empty array
	if (typeof b !== 'object') {
		throw new Error(`browser, if/when defined, MUST be an object`);
	}
	//	browser should have a type defined
	if (!BROWSER_TYPES.includes(b.type)) {
		throw new Error(`browser MUST define one of the supported types [${BROWSER_TYPES.join(',')}]`);
	}
	//	scheme should be valid, if any
	if (b.scheme && !SCHEMES.includes(b.scheme)) {
		throw new Error(`scheme MUST be one of the supported ones [${SCHEMES.join(',')}]`);
	}
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