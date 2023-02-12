export {
	installExecutionContext,
	obtainExecutionContext,
	ENVIRONMENT_KEYS,
	EXECUTION_MODES
}

// let cachedEnvConfig;

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

// class EnvConfig {
// 	constructor(sesId, envId, serverOrigin) {
// 		if (!sesId) {
// 			throw new Error(`invalid config parameter (ses ID): ${sesId}`);
// 		}
// 		if (!envId) {
// 			throw new Error(`invalid config parameter (env ID): ${envId}`);
// 		}
// 		if (!serverOrigin) {
// 			throw new Error(`invalid config parameter (server origin): ${serverOrigin}`);
// 		}

// 		this.sesId = sesId;
// 		this.envId = envId;
// 		this.serverOrigin = serverOrigin;
// 		Object.freeze(this);
// 	}
// }

class ExecutionContext {
	#mode;
	#testId;
	#parentPort = null;
	#childPort = null;

	constructor(mode, testId, childPort) {
		if (!mode || !(mode in EXECUTION_MODES)) {
			throw new Error(`one of the [${EXECUTION_MODES}] expected, received: ${mode}`);
		}

		this.#mode = mode;
		this.#testId = testId;
		if (!childPort) {
			const mc = new MessageChannel();
			this.#parentPort = mc.port1;
			this.#childPort = mc.port2;
		} else {
			this.#childPort = childPort;
		}

		Object.freeze(this);
	}

	get mode() { return this.#mode; }
	get testId() { return this.#testId; }
	get childPort() { return this.#childPort; }
	get parentPort() { return this.#parentPort; }
}

function installExecutionContext(key = EXECUTION_CONTEXT_SYMBOL, mode, childPort = null, testId = null) {
	const context = new ExecutionContext(mode, testId, childPort);
	globalThis[key] = context;
}

function obtainExecutionContext(key = EXECUTION_CONTEXT_SYMBOL) {
	let result = globalThis[EXECUTION_CONTEXT_SYMBOL];
	if (!result) {
		console.log('no execution context found, creating PLAIN run one...');
		installExecutionContext(key, EXECUTION_MODES.PLAIN_RUN);
		result = obtainExecutionContext(key);
	}
	return result;
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