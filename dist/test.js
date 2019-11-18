const
	STATUSES = Object.freeze({ QUEUED: 0, SKIPPED: 1, RUNNING: 2, PASSED: 3, FAILED: 4, ERRORED: 5 }),
	DEFAULT_TEST_OPTIONS = Object.freeze({
		sync: false,
		skip: false,
		timeout: 10000
	}),
	FINALIZE_KEY = Symbol('finalize.key');

export {
	STATUSES
}

export class Test {
	constructor(options, testCode) {
		if (!options || typeof options !== 'object') {
			throw new Error('options MUST be a non-null object');
		}
		if (!options.name || typeof options.name !== 'string') {
			throw new Error('name MUST be a non empty string within the options');
		}

		Object.assign(
			this,
			DEFAULT_TEST_OPTIONS,
			options
		);
		this.timeoutWatcher = null;
		this.code = testCode;
		this.start = null;
		this.duration = null;
		this.status = this.skip ? STATUSES.SKIPPED : STATUSES.QUEUED;
		this.error = null;
		Object.seal(this);
	}

	async run() {
		if (this.skip) {
			this[FINALIZE_KEY](STATUSES.SKIPPED);
		} else {
			//	setup timeout watcher
			this.timeoutWatcher = setTimeout(() => {
				const timeoutError = new Error('timeout; remember - you can set a custom timeout if relevant');
				this[FINALIZE_KEY](STATUSES.FAILED, timeoutError);
			}, this.timeout);

			this.status = STATUSES.RUNNING;
			this.start = performance.now();
			try {
				const result = await Promise.resolve(this.code(this))
				if (result === false) {
					this[FINALIZE_KEY](STATUSES.FAILED, 'explicit false returned');
				} else {
					this[FINALIZE_KEY](STATUSES.PASSED);
				}
			} catch (e) {
				this[FINALIZE_KEY](STATUSES.ERRORED, e);
			}
		}

		return this.status;
	}

	[FINALIZE_KEY](status, error) {
		if (this.status === STATUSES.RUNNING) {
			this.duration = performance.now() - this.start;
			if (this.timeoutWatcher) {
				clearInterval(this.timeoutWatcher);
				this.timeoutWatcher = null;
			}
			this.status = status;
			this.error = error;
		}
	}

	async waitNextMicrotask() { return new Promise(resolve => setTimeout(resolve, 0)); }

	async waitMillis(millis) { return new Promise(resolve => setTimeout(resolve, millis)); }

	assertEqual(expected, actual) {
		if (expected !== actual) {
			throw new Error('expected: ' + expected + ', found: ' + actual);
		}
	}

	assertNotEqual(expected, actual) {
		if (expected === actual) {
			throw new Error('expected: ' + expected + ', found: ' + actual);
		}
	}

	assertFalse(expression) {
		if (expression !== false) {
			throw new Error('expected: false, found: ' + expression);
		}
	}

	assertTrue(expression) {
		if (expression !== true) {
			throw new Error('expected: true, found: ' + expression);
		}
	}

	fail(message) {
		throw new Error(message);
	}
}

/* <testsuite name="nosetests" tests="1" errors="1" failures="0" skip="0">
	<testcase classname="path_to_test_suite.TestSomething"
		name="test_it" time="0">
		<error type="exceptions.TypeError" message="oops, wrong type">
			Traceback (most recent call last):
			...
			TypeError: oops, wrong type
        </error>
	</testcase>
</testsuite> */