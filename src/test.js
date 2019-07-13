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
			this.pass = resolve;
			this.fail = reject;
			try {
				this.testCode(this);
			} catch (e) {
				reject(e);
			}
		});
		testPromise
			.then(
				msg => { this.finalize('pass', msg); },
				msg => {
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

export function stringifyDuration(d) {
	if (d > 99) return (d / 1000).toFixed(1) + ' s';
	else if (d > 59900) return (d / 60000).toFixed(1) + ' m';
	else return d.toFixed(1) + ' ms';
};