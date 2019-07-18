const
	DEFAULT_TEST_NAME = 'nameless test',
	DEFAULT_TEST_TIMEOUT = 10000;

export function Test(options, testCode) {
	if (typeof testCode !== 'function') {
		throw new Error('test code MUST be a function');
	}
	this.name = options.name || DEFAULT_TEST_NAME;
	this.skip = Boolean(options.skip);
	this.timeout = typeof options.timeout === 'number' ? options.timeout : DEFAULT_TEST_TIMEOUT;
	this.testCode = testCode;

	this.status = this.skip ? 'skip' : null;
	this.error = null;
	this.duration = null;

	this.run = async function () {
		this.start = performance.now();
		this.status = 'runs';
		this.error = null;
		this.duration = 0;

		const testPromise = new Promise((resolve, reject) => {
			this.timeoutWatcher = setTimeout(() => {
				reject(new Error('timeout, have you forgotten to call pass/fail?'));
			}, this.timeout);

			enrichTestApis(this, resolve, reject);

			try {
				const testResult = this.testCode(this);
				if (testResult instanceof Promise) {
					testResult.catch(reject);
				}
			} catch (e) {
				reject(e);
			}
		});
		testPromise
			.then(msg => this.finalize('pass', msg))
			.catch(msg => {
				const error = msg instanceof Error ? msg : new Error(msg);
				this.finalize('fail', error);
			});
		return testPromise;
	}

	this.finalize = function (res, error) {
		if (this.timeoutWatcher) {
			clearInterval(this.timeoutWatcher);
			this.timeoutWatcher = null;
		}
		this.end = performance.now();
		this.error = error;
		this.status = res;
		this.duration = this.end - this.start;
	}
}

function enrichTestApis(test, resolve, reject) {
	test.pass = resolve;
	test.fail = error => {
		const e = error instanceof Error ? error : new Error(error);
		reject(e);
		throw e;
	};
	test.waitNextMicrotask = async () => new Promise(resolve => setTimeout(resolve, 0));
	test.waitMillis = async (waitMillis) => new Promise(resolve => setTimeout(resolve, waitMillis));

	//	TODO: add here optional assertions framework? Chai as a HUB?
	test.assertEqual = (actual, expected) => {
		if (expected !== actual) {
			test.fail(new Error('expected: ' + expected + ', found ' + actual));
		}
	};
	test.assertTrue = expression => {
		if (expression !== true) {
			test.fail(new Error('expression did not resolved to true'));
		}
	};
	test.assertFalse = expression => {
		if (expression !== false) {
			test.fail(new Error('expression did not resolved to false'));
		}
	};
}