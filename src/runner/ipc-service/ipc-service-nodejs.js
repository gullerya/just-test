/**
 * IPC TEP (Test Execution Protocol service):
 * - manages interoperability between the session execution process and test execution process
 * - delivers domain aware IPC
 * - provides both, parent and child functionality
 * - NodeJS implementation
 */
const MESSAGE_TYPES = Object.freeze({
	GET_TEST_CONFIG: 'getTestConfig',
	TEST_CONFIG: 'testConfig',
	RUN_STARTED: 'runStarted',
	RUN_RESULT: 'runResult'
});

let messageId = 0;

export class TestRunWorker {
	constructor(port) {
		if (!port || typeof port.send !== 'function') {
			throw new Error(`invalid port object '${port}'`);
		}
		this.port = port;
		Object.freeze(this);
	}

	/**
	 * this method does the full interop of getting test configuration
	 * - sends request
	 * - waits for response
	 */
	async getTestConfig(testId) {
		const mid = messageId++;
		const resultPromise = waitMessage(this.port, MESSAGE_TYPES.TEST_CONFIG, mid, 1000);
		this.port.send({
			mid: mid,
			type: MESSAGE_TYPES.GET_TEST_CONFIG,
			testId: testId
		});
		return resultPromise;
	}

	sendRunStarted(testId) {
		this.port.send({
			mid: messageId++,
			type: MESSAGE_TYPES.RUN_STARTED,
			testId: testId
		});
	}

	sendRunResult(testId, runResult) {
		this.port.send({
			mid: messageId++,
			type: MESSAGE_TYPES.RUN_RESULT,
			testId: testId,
			runResult: runResult
		});
	}
}

export class TestRunManager {
	constructor(port, test) {
		if (!port || typeof port.send !== 'function') {
			throw new Error(`invalid port object '${port}'`);
		}
		this.port = port;
		this.test = test;
		this.runStarted = new Promise(r => {
			this._resolveStarted = r;
		});
		this.runEnded = new Promise(r => {
			this._resolveEnded = r;
		});

		this.setupListeners();
		Object.freeze(this);
	}

	setupListeners() {
		this.port.on('message', me => {
			//	validate message is for this test
			if (me.testId !== this.test.id) {
				return;
			}

			if (me.type === MESSAGE_TYPES.GET_TEST_CONFIG) {
				this.port.send({
					mid: me.mid,
					type: MESSAGE_TYPES.TEST_CONFIG,
					data: this.test
				});
			} else if (me.type === MESSAGE_TYPES.RUN_STARTED) {
				this._resolveStarted(me.testId);
			} else if (me.type === MESSAGE_TYPES.RUN_RESULT) {
				this._resolveEnded({
					testId: me.testId,
					runResult: me.runResult
				});
			}
		}, false);
	}
}

async function waitMessage(port, messageType, mId, timeout) {
	return Promise.race([
		new Promise((_, r) => setTimeout(() => r(`awaiting for message ${mId} timed out ${timeout}ms`), timeout)),
		new Promise(r => {
			port.on('message', message => {
				if (message && message.type === messageType && message.mid === mId) {
					r(message.data);
				}
			}, false);
		})
	]);
}
