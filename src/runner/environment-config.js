export {
	setExecutionContext,
	getExecutionContext,
	ENVIRONMENT_KEYS,
	EXECUTION_MODES
}

const EXECUTION_CONTEXT_SYMBOL = Symbol.for('JUST_TEST_EXECUTION_CONTEXT');
const ENVIRONMENT_KEYS = Object.freeze({
	TEST_ID: 'test-id',
	SESSION_ID: 'ses-id',
	ENVIRONMENT_ID: 'env-id',
	SERVER_ORIGIN: 'server-origin'
});
const EXECUTION_MODES = Object.freeze({
	PLAIN_RUN: 'PLAIN_RUN',
	PLAN: 'PLAN',
	TEST: 'TEST'
});

class BaseExecutionContext {
	#mode;
	#testId;

	constructor(mode, testId) {
		this.#mode = mode;
		this.#testId = testId;
	}

	get mode() { return this.#mode; }
	get testId() { return this.#testId; }
}

class PlanningExecutionContext extends BaseExecutionContext {
	#suiteName;
	#testConfigs = [];

	constructor() {
		super(EXECUTION_MODES.PLAN);
		Object.freeze(this);
	}

	addTestConfig(testConfig) {
		this.#testConfigs.push(testConfig);
	}

	get testConfigs() { return this.#testConfigs; }
	get suiteName() { return this.#suiteName; }
	set suiteName(value) { this.#suiteName = value; }
}

class TestingExecutionContext extends BaseExecutionContext {
	#startHandler;
	#endHandler;

	constructor(testId, startHandler, endHandler) {
		super(EXECUTION_MODES.TEST, testId);
		this.#startHandler = startHandler;
		this.#endHandler = endHandler;
		Object.freeze(this);
	}

	get startHandler() { return this.#startHandler; }
	get endHandler() { return this.#endHandler; }
}

function setExecutionContext(mode, testId = null, startHandler, endHandler, key = EXECUTION_CONTEXT_SYMBOL) {
	let result;
	switch (mode) {
		case EXECUTION_MODES.PLAN: {
			result = new PlanningExecutionContext();
			break;
		}
		case EXECUTION_MODES.TEST: {
			result = new TestingExecutionContext(testId, startHandler, endHandler);
			break;
		}
		default:
			throw new Error(`unexpected execution mode '${mode}'`);
	}
	globalThis[key] = result;
	return result;
}

function getExecutionContext(key = EXECUTION_CONTEXT_SYMBOL) {
	return globalThis[key];
}

// async function getEnvironmentConfig() {
// 	if (!cachedEnvConfig) {
// 		let resultPromise;
// 		if (globalThis.process) {
// 			resultPromise = getNodejsEnvConfig();
// 		} else {
// 			resultPromise = getBrowserEnvConfig();
// 		}
// 		const result = await resultPromise;
// 		if (!result) {
// 			throw new Error(`illegal environment configuration '${JSON.stringify(result)}'`);
// 		} else {
// 			console.info('runner environment config:');
// 			console.info(JSON.stringify(result));
// 		}
// 		cachedEnvConfig = result;
// 	}

// 	return cachedEnvConfig;
// }

/**
 * extracts env config from the `location.href` search params
 * @returns env config object
 */
// function getBrowserEnvConfig() {
// 	const sp = new URL(globalThis.location.href).searchParams;
// 	const sesId = sp.get(ENVIRONMENT_KEYS.SESSION_ID);
// 	const envId = sp.get(ENVIRONMENT_KEYS.ENVIRONMENT_ID);
// 	const serverOrigin = globalThis.location.origin;
// 	return new EnvConfig(sesId, envId, serverOrigin);
// }

/**
 * extracts env config from the `process.argv`
 * @returns env config object
 */
// function getNodejsEnvConfig() {
// 	let sesId, envId, serverOrigin;
// 	for (const arg of globalThis.process.argv) {
// 		if (arg.startsWith(ENVIRONMENT_KEYS.SESSION_ID + '=')) {
// 			sesId = arg.split('=').pop();
// 		} else if (arg.startsWith(ENVIRONMENT_KEYS.ENVIRONMENT_ID + '=')) {
// 			envId = arg.split('=').pop();
// 		} else if (arg.startsWith(ENVIRONMENT_KEYS.SERVER_ORIGIN + '=')) {
// 			serverOrigin = arg.split('=').pop();
// 		}
// 	}

// 	return new EnvConfig(sesId, envId, serverOrigin);
// }