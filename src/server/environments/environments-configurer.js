const
	// ENVIRONMENT_BLUEPRINT = Object.freeze({
	// 	interactive: true,
	// 	browsers: null,
	// 	node: null
	// }),
	BROWSERS = Object.freeze({
		chromium: 'chromium',
		firefox: 'firefox',
		webkit: 'webkit'
	}),
	SCHEMES = Object.freeze({
		light: 'light',
		dark: 'dark'
	});

export {
	BROWSERS,
	SCHEMES
}

export default environmentConfig => {
	validateEnvironment(environmentConfig);

	const result = {};
	if (environmentConfig.browsers) {
		result.browsers = processBrowsers(environmentConfig.browsers);
	} else if (environmentConfig.node) {
		result.node = processNode(environmentConfig.node);
	} else {
		result.interactive = true;
	}

	return result;
};

function processBrowsers(bs) {
	const tmp = [];
	for (const b of bs) {
		const tmpB = { type: b.type };
		if (b.scheme in SCHEMES) {
			tmpB.scheme = b.scheme;
		}
	}
	return tmp;
}

function processNode() {
	throw new Error(`unsupported environment`);
}

function validateEnvironment(e) {
	//	interactive is exclusive
	if (e.interactive && (e.browsers || e.node)) {
		throw new Error(`environment can NOT be interactive and define browser/node; violator: ${JSON.stringify(e)}`);
	}

	//	browser and node are mutually exclusive
	if (e.browsers && e.node) {
		throw new Error(`environment can NOT define browser AND node together; violator: ${JSON.stringify(e)}`);
	}

	if (e.browsers) {
		//	browsers should be an non-empty array
		if (!Array.isArray(e.browsers) || !e.browsers.length) {
			throw new Error(`browsers, if/when defined, MUST be non-empty array; violator: ${JSON.stringify(e)}`);
		}
		//	browsers should define at least type and types are mutually excluse
		const distinctBrowsers = {};
		for (const b of e.browsers) {
			if (b.type in BROWSERS) {
				if (b.type in distinctBrowsers) {
					throw new Error(`browser of the same type MAY ONLY be defined once; violator: ${JSON.stringify(e)}`);
				} else {
					distinctBrowsers[b.type] = true;
				}
			} else {
				throw new Error(`browser MUST define one of the supported types (${Object.keys(BROWSERS)}); violator: ${JSON.stringify(e)}`);
			}
		}
	}
}