import { assert } from 'chai';
import { test } from 'just-test';
import { EXECUTION_MODES, setExecutionContext } from '../../src/runner/environment-config.js';

const localECKey = 'test-suite-api-ec';

test('suite PLAN - base API', async () => {
	const pp = prepareExecutionContext();
	const rp = new Promise(r => { pp.onmessage = r; pp.unref(); });

	test('name', { ecKey: localECKey }, () => { });

	const m = await rp;
	assert.deepEqual(m.data, {
		type: 'TEST_PLAN',
		testName: 'name',
		testOpts: { only: false, skip: false, timeout: 3000 }
	});
});

test('suite PLAN - base API FAIL', async () => {
	const pp = prepareExecutionContext();
	const rp = new Promise(r => { pp.onmessage = r; pp.unref(); });

	assert.throws(async () => await test('name', { ecKey: localECKey, only: true, skip: true }, () => { }), 'at the same time');
});

function prepareExecutionContext(mode = EXECUTION_MODES.PLAN) {
	const mc = new MessageChannel();
	setExecutionContext(localECKey, mode, mc.port2);
	return mc.port1;
}