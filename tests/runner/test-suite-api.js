import { test } from '@gullerya/just-test';
import { assert } from '@gullerya/just-test/assert';
import { EXECUTION_MODES, setExecutionContext } from '../../src/runner/environment-config.js';

const localECKey = 'test-suite-api-ec';

test('suite PLAN - base API', async () => {
	const pp = prepareExecutionContext();
	test('name', { ecKey: localECKey }, () => { });

	assert.isTrue(pp instanceof Object && Array.isArray(pp.testConfigs));
	assert.deepEqual(pp.testConfigs[0], {
		name: 'name',
		config: { only: false, skip: false, timeout: 3000, ecKey: localECKey }
	});
});

test('suite PLAN - base API FAIL', async () => {
	prepareExecutionContext();
	await assert.throws(async () => await test('name', { ecKey: localECKey, only: true, skip: true }, () => { }), 'at the same time');
});

function prepareExecutionContext(mode = EXECUTION_MODES.PLAN) {
	return setExecutionContext(mode, null, null, null, localECKey);
}