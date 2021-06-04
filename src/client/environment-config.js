import { SESSION_ENVIRONMENT_KEYS } from '../common/constants.js';

export {
	getEnvironmentConfig
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
			console.info('client environment config:');
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