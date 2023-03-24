export {
	DEFAULT,
	EVENT,
	INTEROP_NAMES,
	STATUS,
	SUITE_CONFIG_DEFAULT,
	TEST_ID_SEPARATOR,
	TEST_CONFIG_DEFAULT
};

const TEST_ID_SEPARATOR = ' => ';

const DEFAULT = Object.freeze({
	TEST_RUN_TTL: 3000
});

const EVENT = Object.freeze({
	RUN_START: 'RUN_START',
	RUN_END: 'RUN_END'
});

const STATUS = Object.freeze({
	SKIP: 'skip',
	WAIT: 'wait',
	RUNS: 'runs',
	PASS: 'pass',
	FAIL: 'fail',
	ERROR: 'error'
});

const SUITE_CONFIG_DEFAULT = Object.freeze({
	skip: false,
	sync: false
});

const TEST_CONFIG_DEFAULT = Object.freeze({
	ttl: DEFAULT.TEST_RUN_TTL,
	skip: false,
	sync: false
});

const INTEROP_NAMES = Object.freeze({
	REGISTER_TEST_FOR_COVERAGE: '_registerTestForCoverage'
});
