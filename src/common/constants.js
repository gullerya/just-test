export {
	DEFAULT,
	EVENT,
	INTEROP_NAMES,
	EXECUTION_MODES,
	ENVIRONMENT_KEYS,
	STATUS,
	SUITE_CONFIG_DEFAULT,
	TEST_ID_SEPARATOR,
	TEST_CONFIG_DEFAULT
}

const TEST_ID_SEPARATOR = ' => ';

const DEFAULT = Object.freeze({
	TEST_RUN_TTL: 3000
});

const EVENT = Object.freeze({
	TEST_SELECT: 'TEST_SELECT',
	TEST_RERUN: 'TEST_RERUN',
	RUN_STARTED: 'RUN_STARTED',
	RUN_ENDED: 'RUN_ENDED'
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
	REGISTER_TEST_FOR_COVERAGE: '_registerTestForCoverage',
	IPC_HANDSHAKE: 'ipcHandshake'
});

const EXECUTION_MODES = Object.freeze({
	PLAIN_RUN: 'PLAIN_RUN',
	PLAN: 'PLAN',
	TEST: 'TEST'
});

const ENVIRONMENT_KEYS = Object.freeze({
	TEST_ID: 'test-id',
	SESSION_ID: 'ses-id',
	ENVIRONMENT_ID: 'env-id',
	SERVER_ORIGIN: 'server-origin'
});
