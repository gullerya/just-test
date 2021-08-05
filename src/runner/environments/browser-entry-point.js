/**
 * browser specific session runner
 * - retrieves the session and environment IDs from search params
 * - sets up object model in the browser environment way
 */

import { SESSION_ENVIRONMENT_KEYS, TESTBOX_ENVIRONMENT_KEYS } from '../../common/constants.js';

export {
	getEnvironmentSetup
}

function getEnvironmentSetup() {
	let result = null;
	const sp = new URL(globalThis.location.href).searchParams;
	if (sp) {
		const sesId = sp.get(SESSION_ENVIRONMENT_KEYS.SESSION_ID);
		const envId = sp.get(SESSION_ENVIRONMENT_KEYS.ENVIRONMENT_ID);
		if (sesId && envId) {
			result = {
				sesId: sesId,
				envId: envId
			};
		}
	}
	return result;
}
