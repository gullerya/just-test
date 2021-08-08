/**
 * IPC TEP (Test Execution Protocol service):
 * - manages interoperability between the session execution process and test execution process
 * - delivers domain aware IPC
 * - provides both, parent and child functionality
 * - platform agnostic API and implementation
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
	RUN_STARTED: 'runStarted',
	RUN_RESULT: 'runResult'
});

let messageId = 0;

export class TestRunWorker {
	constructor(envType, port) {
		if (!Object.values(ENVIRONMENT_TYPES).some(et => et === envType)) {
			throw new Error(`invalid environment type '${envType}'`);
		}
		if (!(port instanceof MessagePort)) {
			throw new Error(`invalid port object '${port}'`);
		}
		this.envType = envType;
		this.port = port;
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
		const resultPromise = this.ipcEngine.waitMessage(this.port, MESSAGE_TYPES.TEST_CONFIG, mid, 1000);
		this.ipcEngine.sendMessage(this.port, {
			mid: mid,
			type: MESSAGE_TYPES.GET_TEST_CONFIG,
			testId: testId
		});
		return (await resultPromise).data;
	}

	sendRunStarted(testId) {
		const mid = messageId++;
		this.ipcEngine.sendMessage(this.port, {
			mid: mid,
			type: MESSAGE_TYPES.RUN_STARTED,
			testId: testId
		});
	}

	sendRunResult(testId, runResult) {
		const mid = messageId++;
		this.ipcEngine.sendMessage(this.port, {
			mid: mid,
			type: MESSAGE_TYPES.RUN_RESULT,
			testId: testId,
			runResult: runResult
		});
	}
}

export class TestRunManager {
	constructor(envType, port, test) {
		if (!Object.values(ENVIRONMENT_TYPES).some(et => et === envType)) {
			throw new Error(`invalid environment type '${envType}'`);
		}
		if (!(port instanceof MessagePort)) {
			throw new Error(`invalid port object '${port}'`);
		}
		this.envType = envType;
		this.port = port;
		this.test = test;
		this.ipcEngine = envType === ENVIRONMENT_TYPES.BROWSER
			? BrowserIPC
			: envType === ENVIRONMENT_TYPES.NODE_JS
				? Node_JsIPC
				: null;
		this.runStarted = new Promise(r => {
			this._resolveStarted = r;
		});
		this.runEnded = new Promise(r => {
			this._resolveEnded = r;
		});

		this.setupListeners(port);
		Object.freeze(this);
	}

	//	TODO: this is browser specific now, move some of this to implementation detail
	setupListeners(port) {
		this.ipcEngine.addEventListener(port, me => {
			//	validate data
			if (!me || !me.data) {
				return;
			}
			//	validate message is for this test
			if (me.data.testId !== this.test.id) {
				return;
			}

			if (me.data.type === MESSAGE_TYPES.GET_TEST_CONFIG) {
				this.ipcEngine.sendMessage(this.port, {
					mid: me.data.mid,
					type: MESSAGE_TYPES.TEST_CONFIG,
					data: this.test
				});
			} else if (me.data.type === MESSAGE_TYPES.RUN_STARTED) {
				this._resolveStarted(me.data.testId);
			} else if (me.data.type === MESSAGE_TYPES.RUN_RESULT) {
				this._resolveEnded({
					testId: me.data.testId,
					runResult: me.data.runResult
				});
			}
		}, false);
	}
}