import { SESSION_ENVIRONMENT_KEYS } from '../common/constants.js';
export { EXECUTION_MODES } from '../common/constants.js';

export {
	getEnvironmentConfig,
	ExecutionContext
}

let cachedEnvConfig;

class EnvConfig {
	constructor(sesId, envId, serverOrigin) {
		if (!sesId || !envId) {
			throw new Error(`invalid config parameters: ${sesId}:${envId}`);
		}
		if (serverOrigin === undefined || serverOrigin === null) {
			throw new Error(`invalid config parameter (server origin): ${serverOrigin}`);
		}

		this.sesId = sesId;
		this.envId = envId;
		this.serverOrigin = serverOrigin;
		Object.freeze(this);
	}
}

class ExecutionContext {
	static #EXECUTION_CONTEXT_SYMBOL = Symbol.for('JUST_TEST_EXECUTION_CONTEXT');

	constructor(mode) {
		if (!(mode in EXECUTION_MODES)) {
			throw new Error(`one of the EXECUTION_MODES expected; received: ${mode}`);
		}

		this.mode = mode;
		Object.freeze(this);
	}

	static install(context) {
		if (!(context instanceof ExecutionContext)) {
			throw new Error(`context object expected; received: ${context}`);
		}
		globalThis[this.#EXECUTION_CONTEXT_SYMBOL] = context;
	}

	static obtain() {
		const foundContext = globalThis[this.#EXECUTION_CONTEXT_SYMBOL];
		//	here to do some more involved processing
		//	returning a newly constructed one
		return new ExecutionContext(
			foundContext.mode
		);
	}
}

async function getEnvironmentConfig() {
	if (!cachedEnvConfig) {
		let resultPromise;
		if (globalThis.process) {
			resultPromise = getNodejsEnvConfig();
		} else {
			resultPromise = getBrowserEnvConfig();
		}
		const result = await resultPromise;
		if (!result) {
			throw new Error(`illegal environment configuration '${JSON.stringify(result)}'`);
		} else {
			console.info('runner environment config:');
			console.info(JSON.stringify(result));
		}
		cachedEnvConfig = result;
	}

	return cachedEnvConfig;
}

/**
 * extracts env config from the `location.href` search params
 * @returns env config object
 * @throws if data not found
 */
async function getBrowserEnvConfig() {
	const sp = new URL(globalThis.location.href).searchParams;
	const sesId = sp.get(SESSION_ENVIRONMENT_KEYS.SESSION_ID);
	const envId = sp.get(SESSION_ENVIRONMENT_KEYS.ENVIRONMENT_ID);
	const serverOrigin = '';
	return new EnvConfig(sesId, envId, serverOrigin);
}

/**
 * extracts env config from the `process.argv`
 * @returns env config object
 * @throws if data not found
 */
async function getNodejsEnvConfig() {
	let sesId, envId, serverOrigin;
	for (const arg of globalThis.process.argv) {
		if (arg.startsWith(SESSION_ENVIRONMENT_KEYS.SESSION_ID + '=')) {
			sesId = arg.split('=').pop();
		} else if (arg.startsWith(SESSION_ENVIRONMENT_KEYS.ENVIRONMENT_ID + '=')) {
			envId = arg.split('=').pop();
		} else if (arg.startsWith(SESSION_ENVIRONMENT_KEYS.SERVER_ORIGIN + '=')) {
			serverOrigin = arg.split('=').pop();
		}
	}

	return new EnvConfig(sesId, envId, serverOrigin);
}