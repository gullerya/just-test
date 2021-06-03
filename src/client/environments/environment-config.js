import { SESSION_ENVIRONMENT_KEYS } from '../../common/constants.js';

export {
	getEnvironmentConfig
}

class EnvConfig {
	constructor(sesId, envId) {
		if (!sesId || !envId) {
			throw new Error(`invalid config parameters: ${sesId}:${envId}`);
		}
		this.sesId = sesId;
		this.envId = envId;
		Object.freeze(this);
	}
}

async function getEnvironmentConfig() {
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
		console.info(`session:environment config: '${result.sesId}':'${result.envId}'`);
	}
	return result;
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
	return new EnvConfig(sesId, envId);
}

/**
 * extracts env config from the `process.argv`
 * @returns env config object
 * @throws if data not found
 */
async function getNodejsEnvConfig() {
	let sesId, envId;
	for (const arg of globalThis.process.argv) {
		if (arg.startsWith(SESSION_ENVIRONMENT_KEYS.SESSION_ID + '=')) {
			sesId = arg.split('=').pop();
		} else if (arg.startsWith(SESSION_ENVIRONMENT_KEYS.ENVIRONMENT_ID + '=')) {
			envId = arg.split('=').pop();
		}
	}

	return new EnvConfig(sesId, envId);
}