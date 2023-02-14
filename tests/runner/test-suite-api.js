import { assert } from 'chai';
import { test } from 'just-test';
import { EXECUTION_MODES, setExecutionContext } from '../../src/runner/environment-config.js';

const localECKey = 'test-suite-api-ec';

test('suite - base API', async () => {
	prepareExecutionContext();
	//	run test
});

function prepareExecutionContext(mode = EXECUTION_MODES.PLAN) {
	const mc = new MessageChannel();
	setExecutionContext(localECKey, mode, mc.port2);
}