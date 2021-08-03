/**
 * IPC TEP (Test Execution Protocol service)
 * - manages interoperability between the session execution process and test execution process (TestRunBox)
 * - delivers domain aware IPC
 * - provides both, parent and child functionality
 * - supports both, browser and NodeJS environments yet providing unified API
 */
import * as BrowserIPC from './ipc-browser-impl.js';
import * as Node_JsIPC from './ipc-nodejs-impl.js';

export {
	ENVIRONMENT_TYPES
}

const ENVIRONMENT_TYPES = Object.freeze({
	BROWSER: 'browser',
	NODE_JS: 'node_js'
});

const MESSAGE_TYPES = Object.freeze({
	GET_TEST_CONFIG: 'getTestConfig',
	TEST_CONFIG: 'testConfig',
	RUN_RESULT: 'runResult'
});

let messageId = 0;

export class TestRunWorker {
	constructor(envType, processObject) {
		if (!Object.values(ENVIRONMENT_TYPES).some(et => et === envType)) {
			throw new Error(`invalid environment type '${envType}'`);
		}
		if (!processObject || typeof processObject !== 'object') {
			throw new Error(`invalid process object '${processObject}'`);
		}
		this.envType = envType;
		this.processObject = processObject;
		this.ipcEngine = envType === ENVIRONMENT_TYPES.BROWSER
			? BrowserIPC
			: envType === ENVIRONMENT_TYPES.NODE_JS
				? Node_JsIPC
				: null;

		Object.freeze(this);
	}

	/**
	 * this method does the full interop of getting test configuration
	 * - sends request
	 * - waits for response
	 */
	async getTestConfig(testId) {
		const mid = messageId++;
		const resultPromise = this.ipcEngine.waitMessage(this.processObject, MESSAGE_TYPES.TEST_CONFIG, mid, 1000);
		this.ipcEngine.sendMessage(this.processObject, {
			mid: mid,
			type: MESSAGE_TYPES.GET_TEST_CONFIG,
			testId: testId
		});
		return (await resultPromise).data;
	}

	sendRunResult(runResult) {
		const mid = messageId++;
		this.ipcEngine.sendMessage(this.processObject, {
			mid: mid,
			type: MESSAGE_TYPES.RUN_RESULT,
			runResult: runResult
		});
	}
}

export class TestRunManager {
	constructor(envType, processObject, testConfigsMap) {
		if (!Object.values(ENVIRONMENT_TYPES).some(et => et === envType)) {
			throw new Error(`invalid environment type '${envType}'`);
		}
		if (!processObject || typeof processObject !== 'object') {
			throw new Error(`invalid process object '${processObject}'`);
		}
		this.envType = envType;
		this.processObject = processObject;
		this.testConfigsMap = testConfigsMap;
		this.ipcEngine = envType === ENVIRONMENT_TYPES.BROWSER
			? BrowserIPC
			: envType === ENVIRONMENT_TYPES.NODE_JS
				? Node_JsIPC
				: null;

		this.setupListeners(processObject)
		Object.freeze(this);
	}

	setupListeners(processObject) {
		processObject.addEventListener('message', message => {
			if (!message || !message.data) {
				return;
			}

			if (message.data.type === MESSAGE_TYPES.GET_TEST_CONFIG) {
				this.ipcEngine.sendMessage(this.processObject, {
					mid: message.data.mid,
					type: MESSAGE_TYPES.TEST_CONFIG,
					data: this.testConfigsMap[message.data.testId]
				});
			} else if (message.data.type === MESSAGE_TYPES.RUN_RESULT) {
				console.log(message.data.runResult);
			}
		}, false);
	}
}