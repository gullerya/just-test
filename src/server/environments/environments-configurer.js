const
	ENVIRONMENT_BLUEPRINT = Object.freeze({
		interactive: null,
		browser: null,
		node: null,
		tests: null,
		coverage: null
	}),
	PRINCIPAL_ENTRIES = ['interactive', 'browser', 'node'],
	BROWSER_TYPES = ['chromium', 'firefox', 'webkit'],
	SCHEMES = Object.freeze({
		light: 'light',
		dark: 'dark'
	});

export {
	SCHEMES
}

export default environment => {
	validateEnvironment(environment);

	const result = {};
	if (environment.browser) {
		result.browser = processBrowser(environment.browser);
	} else if (environment.node) {
		result.node = processNode(environment.node);
	} else {
		result.interactive = true;
	}

	return result;
};

function processBrowser(b) {
	const tmp = { type: b.type };
	if (b.scheme in SCHEMES) {
		tmpB.scheme = b.scheme;
	}
	return tmp;
}

function processNode(n) {
	throw new Error(`unsupported environment ${n}`);
}

function validateEnvironment(e) {
	//	no foreign entries
	for (const key in e) {
		if (!(key in ENVIRONMENT_BLUEPRINT)) {
			throw new Error(`invalid entry '${key}' in environment definition; violator: ${JSON.stringify(e)}`);
		}
	}

	//	interactive/browser/node are mutually exclusive, at least one is required
	let principalCounter = 0;
	for (const pe of PRINCIPAL_ENTRIES) {
		if (e[pe]) { principalCounter++; }
	}
	if (principalCounter !== 1) {
		throw new Error(`enviroment MUST have one and only one of those [${PRINCIPAL_ENTRIES.join(',')}]; violator: ${JSON.stringify(e)}`)
	}

	//	browser verification
	if (e.browser) {
		//	browsers should be an non-empty array
		if (typeof e.browser !== 'object') {
			throw new Error(`browser, if/when defined, MUST be an object; violator: ${JSON.stringify(e)}`);
		}
		//	browser should have a type defined
		if (!BROWSER_TYPES.includes(e.browser.type)) {
			throw new Error(`browser MUST define one of the supported types [${BROWSER_TYPES.join(',')}]; violator: ${JSON.stringify(e)}`);
		}
	}

	//	interactive verification
	if (e.interactive && typeof e.interactive !== 'boolean') {
		throw new Error(`interactive, if/when defined, MUST be a boolean; violator: ${JSON.stringify(e)}`);
	}

	//	node verification
	if (e.node) {
		throw new Error('node environment is not supported yet');
	}
}