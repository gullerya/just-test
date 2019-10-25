const
	DEFAULT_TEST_OPTIONS = Object.freeze({
		name: 'nameless',
		skip: false,
		timeout: 10000
	});

export function Test(options, testCode) {
	if (typeof testCode !== 'function') {
		throw new Error('test code MUST be a function');
	}
	const opts = Object.assign({}, DEFAULT_TEST_OPTIONS, typeof options === 'string'
		? { name: options }
		: options);
	this.name = opts.name;
	this.skip = opts.skip;
	this.error = null;
	this.duration = null;
	this.testCode = testCode;

	//	if skip - finilize it quickly
	if (this.skip) {
		this.status = 'skip';
		this.whenDone = Promise.resolve();
		return;
	}

	this.whenDone = new Promise(resolve => {
		//	setup timeout watcher
		this.timeoutWatcher = setTimeout(() => {
			const timeoutError = new Error('timeout, have you forgotten to set custom timeout?');
			this.finalize('fail', timeoutError);
			resolve();
		}, opts.timeout);

		//	running the test code requires:
		//	- get synchronous result	= test PASSED unless explisitly false returned, which means test FAILED
		//	- catch synchronous error	= test FAILED
		//	- get asynchronous resolve	= test PASSED
		//	- catch asynchronous reject	= test FAILED
		try {
			this.status = 'runs';
			this.start = performance.now();
			const testResult = this.testCode(this);
			if (testResult instanceof Promise) {
				testResult
					.then(result => {
						if (result === false) {
							this.finalize('fail', 'test returned false');
							resolve();
						} else {
							this.finalize('pass');
							resolve();
						}
					})
					.catch(e => {
						this.finalize('fail', e);
						resolve();
					});
			} else {
				if (testResult === false) {
					this.finalize('fail', 'test returned false');
					resolve();
				} else {
					this.finalize('pass');
					resolve();
				}
			}
		} catch (e) {
			this.finalize('fail', e);
			resolve();
		}
	});
}

Test.prototype.finalize = function (status, error) {
	this.duration = performance.now() - this.start;
	if (this.timeoutWatcher) {
		clearInterval(this.timeoutWatcher);
		this.timeoutWatcher = null;
	}
	this.status = status;
	this.error = error;
};

Test.prototype.waitNextMicrotask = async () => new Promise(resolve => setTimeout(resolve, 0));
Test.prototype.waitMillis = async (waitMillis) => new Promise(resolve => setTimeout(resolve, waitMillis));
Test.prototype.assertEqual = (actual, expected) => {
	if (expected !== actual) {
		throw new Error('expected: ' + expected + ', found: ' + actual);
	}
};
Test.prototype.assertFalse = expression => {
	if (expression !== false) {
		throw new Error('expected: false, found: ' + expression);
	}
};
Test.prototype.assertTrue = expression => {
	if (expression !== true) {
		throw new Error('expected: true, found: ' + expression);
	}
};