/**
 * TEP (Test Execution Protocol service)
 * - manages interoperability between the session execution process and test execution process (TestRunBox)
 * - delivers domain aware IPC
 * - provides both, parent and child functionality
 * - supports both, browser and NodeJS environments yet providing unified API
 */
import {
	requestTestConfig as browserRequestTestConfig,
	submitRunResult as browserSubmitRunResult
} from './ipc-browser-impl.js';
import {
	requestTestConfig as nodeRequestTestConfig,
	submitRunResult as nodeSubmitRunResult
} from './ipc-node-impl.js';

export const ENVIRONMENT_TYPES = Object.freeze({
	BROWSER: 'browser',
	NODE_JS: 'node_js'
});

export class ChildToParent {
	constructor(envType) {
		if (!Object.values(ENVIRONMENT_TYPES).some(et => et === envType)) {
			throw new Error(`invalid environment type '${envType}'`);
		}
		this.envType = envType;

		Object.freeze(this);
	}

	_setupTestConfigListener() {
		//	TODO: here listen for test config and notify env by event
	}

	async requestTestConfig() {
		if (this.envType === ENVIRONMENT_TYPES.BROWSER) {
			browserRequestTestConfig();
		} else {
			nodeRequestTestConfig();
		}
	}

	async submitRunResult(runResult) {
		if (this.envType === ENVIRONMENT_TYPES.BROWSER) {
			browserSubmitRunResult(runResult);
		} else {
			nodeSubmitRunResult(runResult);
		}
	}
}