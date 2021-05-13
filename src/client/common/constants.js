export {
	DEFAULT,
	EVENT,
	STATUS,
	SUITE_OPTIONS_DEFAULT,
	TEST_OPTIONS_DEFAULT
}

const EVENT = Object.freeze({
	TEST_SELECT: 'test:select'
});

const STATUS = Object.freeze({
	SKIP: 'skip',
	WAIT: 'wait',
	RUNS: 'runs',
	PASS: 'pass',
	FAIL: 'fail'
});

const DEFAULT = Object.freeze({
	TEST_RUN_TTL: 3000
});

const SUITE_OPTIONS_DEFAULT = Object.freeze({
	skip: false,
	sync: false
});

const TEST_OPTIONS_DEFAULT = Object.freeze({
	ttl: DEFAULT.TEST_RUN_TTL,
	skip: false,
	sync: false,
	expectError: null
});
