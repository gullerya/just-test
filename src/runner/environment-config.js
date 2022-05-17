import { EXECUTION_MODES, SESSION_ENVIRONMENT_KEYS } from '../common/constants.js';

export {
	installExecutionContext,
	obtainExecutionContext,
	getEnvironmentConfig,
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
	#mode = EXECUTION_MODES.PLAIN_RUN;
	#parentPort = null;
	#childPort = null;

	constructor(mode, parentPort, childPort) {
		if (mode && !(mode in EXECUTION_MODES)) {
			throw new Error(`one of the EXECUTION_MODES expected; received: ${mode}`);
		} else if (mode) {
			this.#mode = mode;
		}
		if (!parentPort && !childPort) {
			console.debug(`no ports supplied, creating own channel`);
			const mc = new MessageChannel();
			this.#parentPort = mc.port1;
			this.#childPort = mc.port2;
		} else {
			this.#parentPort = this.#lookForParentPort(parentPort);
			this.#childPort = childPort;
		}

		Object.freeze(this);
	}

	get mode() { return this.#mode; }

	get parentPort() { return this.#parentPort; }

	get childPort() { return this.#childPort; }

	#lookForParentPort(defaulFallback) {
		let result = defaulFallback;
		// TODO: do some environmental lookup here
		return result;
	}
}

const EXECUTION_CONTEXT_SYMBOL = Symbol.for('JUST_TEST_EXECUTION_CONTEXT');

function installExecutionContext(mode, parentPort = null, childPort = null) {
	const context = new ExecutionContext(mode, parentPort, childPort);
	globalThis[EXECUTION_CONTEXT_SYMBOL] = context;
	console.info(`execution context installed, mode: ${context.mode}`);
	return context;
}

function obtainExecutionContext() {
	let result = globalThis[EXECUTION_CONTEXT_SYMBOL];
	if (!result) {
		console.log('installing default execution context...');
		installExecutionContext(EXECUTION_MODES.PLAIN_RUN);
		result = obtainExecutionContext();
	}

	return result;
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