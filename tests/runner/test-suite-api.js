import { test } from '../../src/runner/just-test.js';
import { assert } from '../../src/common/assert-utils.ts';
import { EXECUTION_MODES, setExecutionContext } from '../../src/runner/environment-config.js';

const localECKey = 'test-suite-api-ec';

test('suite PLAN - base API', () => {
	const pp = prepareExecutionContext();
	test('name', () => { }, { ecKey: localECKey });

	assert.isTrue(pp instanceof Object && Array.isArray(pp.testConfigs));
	assert.deepEqual(pp.testConfigs[0], {
		name: 'name',
		config: { only: false, skip: false, timeout: 3000, ecKey: localECKey }
	});
});

test('suite PLAN - base API FAIL', async () => {
	prepareExecutionContext();
	const tr = await test('name', () => { }, { ecKey: localECKey, only: true, skip: true });
	assert.strictEqual(tr.error.message, `can't opt in 'only' and 'skip' at the same time, found in test: name`);
});

function prepareExecutionContext(mode = EXECUTION_MODES.PLAN) {
	return setExecutionContext(mode, null, null, null, localECKey);
}