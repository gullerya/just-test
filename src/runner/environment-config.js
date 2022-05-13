import { EXECUTION_MODES, SESSION_ENVIRONMENT_KEYS } from '../common/constants.js';

export {
	getEnvironmentConfig,
	ExecutionContext,
	EXECUTION_MODES
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
	static #DEFAULT_EXECUTION_CONTEXT = new ExecutionContext();

	#mode = EXECUTION_MODES.PLAIN_RUN;

	constructor(mode) {
		if (mode && !(mode in EXECUTION_MODES)) {
			throw new Error(`one of the EXECUTION_MODES expected; received: ${mode}`);
		} else if (mode) {
			this.#mode = mode;
		}

		Object.freeze(this);
	}

	get mode() { return this.#mode; }

	static install(context) {
		if (!(context instanceof ExecutionContext)) {
			throw new Error(`context object expected; received: ${context}`);
		}
		globalThis[ExecutionContext.#EXECUTION_CONTEXT_SYMBOL] = context;
	}

	static obtain() {
		let result = globalThis[ExecutionContext.#EXECUTION_CONTEXT_SYMBOL];
		if (!result) {
			result = ExecutionContext.#DEFAULT_EXECUTION_CONTEXT;
			ExecutionContext.install(result);
		}

		return result;
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