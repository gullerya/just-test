const
	STATUSES = Object.freeze({ QUEUED: 0, SKIPPED: 1, RUNNING: 2, PASSED: 3, FAILED: 4, ERRORED: 5 }),
	DEFAULT_TEST_OPTIONS = Object.freeze({
		sync: false,
		skip: false,
		timeout: 10000
	}),
	FINALIZE_TEST_KEY = Symbol('finalize.test.key'),
	PROCESS_ERROR_KEY = Symbol('process.stack.key');

class AssertError extends Error { }

class TimeoutError extends AssertError { }

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
		if (typeof testCode !== 'function') {
			throw new Error('test code MUST be a function');
		}

		Object.assign(this, DEFAULT_TEST_OPTIONS, options);
		this.timeoutWatcher = null;
		this.code = testCode;
		this.start = null;
		this.duration = null;
		this.status = STATUSES.QUEUED;
		this.error = null;
		Object.seal(this);
	}

	async run() {
		if (this.status === STATUSES.RUNNING) {
			throw new Error('the test is still running');
		}

		if (this.skip) {
			this.status = STATUSES.SKIPPED;
		} else {
			//	setup timeout watcher
			this.timeoutWatcher = setTimeout(() => {
				this[FINALIZE_TEST_KEY](new TimeoutError('timeout; remember - you can set a custom timeout if relevant'));
			}, this.timeout);

			this.duration = null;
			this.status = STATUSES.RUNNING;
			this.start = performance.now();
			try {
				this[FINALIZE_TEST_KEY](await Promise.resolve(this.code(this)));
			} catch (e) {
				this[FINALIZE_TEST_KEY](e);
			}
		}

		return this.status;
	}

	[FINALIZE_TEST_KEY](error) {
		if (this.status !== STATUSES.RUNNING) {
			return;
		}

		this.duration = performance.now() - this.start;
		if (this.timeoutWatcher) {
			clearInterval(this.timeoutWatcher);
			this.timeoutWatcher = null;
		}

		if (error === false) {
			this.status = STATUSES.FAILED;
		} else if (error instanceof Error) {
			const pe = this[PROCESS_ERROR_KEY](error);
			if (this.expectError && (pe.type === this.expectError || pe.message.indexOf(this.expectError) >= 0)) {
				this.status = STATUSES.PASSED;
			} else {
				this.error = pe;
				if (error instanceof AssertError) {
					this.status = STATUSES.FAILED;
				} else {
					this.status = STATUSES.ERRORED;
				}
			}
		} else {
			if (this.expectError) {
				this.status = STATUSES.FAILED;
				this.error = this[PROCESS_ERROR_KEY](new AssertError('expected an error ("' + this.expectError + '") but not seen'));
			} else {
				this.status = STATUSES.PASSED;
			}
		}
	}

	[PROCESS_ERROR_KEY](error) {
		const replacable = window.location.origin;
		error.type = error.constructor.name;
		error.stackLines = error.stack.split(/\r\n|\r|\n/)
			.map(l => l.trim())
			.map(l => l.replace(replacable, ''));
		error.stackLines.shift();
		//	TODO: probably extract file location from each line...
		return error;
	}

	async waitNextMicrotask() { return new Promise(resolve => setTimeout(resolve, 0)); }

	async waitMillis(millis) { return new Promise(resolve => setTimeout(resolve, millis)); }

	assertEqual(expected, actual) {
		if (expected !== actual) {
			throw new AssertError('expected: ' + expected + ', found: ' + actual);
		}
	}

	assertNotEqual(unexpected, actual) {
		if (unexpected === actual) {
			throw new AssertError('unexpected: ' + unexpected + ', found: ' + actual);
		}
	}

	assertFalse(expression) {
		if (expression !== false) {
			throw new AssertError('expected: false, found: ' + expression);
		}
	}

	assertTrue(expression) {
		if (expression !== true) {
			throw new AssertError('expected: true, found: ' + expression);
		}
	}

	fail(message) {
		throw new AssertError(message);
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