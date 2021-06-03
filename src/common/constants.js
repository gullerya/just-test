export {
	DEFAULT,
	EVENT,
	INTEROP_NAMES,
	SESSION_ENVIRONMENT_KEYS,
	STATUS,
	SUITE_OPTIONS_DEFAULT,
	TEST_ID_SEPARATOR,
	TEST_OPTIONS_DEFAULT
}

const TEST_ID_SEPARATOR = ' => ';

const DEFAULT = Object.freeze({
	TEST_RUN_TTL: 3000
});

const EVENT = Object.freeze({
	TEST_SELECT: 'test:select',
	TEST_RERUN: 'test:rerun'
});

const STATUS = Object.freeze({
	SKIP: 'skip',
	WAIT: 'wait',
	RUNS: 'runs',
	PASS: 'pass',
	FAIL: 'fail',
	ERROR: 'error'
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

const INTEROP_NAMES = Object.freeze({
	REGISTER_TEST_FOR_COVERAGE: '_registerTestForCoverage'
});

const SESSION_ENVIRONMENT_KEYS = Object.freeze({
	SESSION_ID: 'ses-id',
	ENVIRONMENT_ID: 'env-id'
});