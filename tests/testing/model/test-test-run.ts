import { test } from '../../../src/runner/just-test.ts';
import { assert } from '../../../src/common/assert-utils.ts';
import { STATUS } from '../../../src/common/constants.ts';
import { TestRun } from '../../../src/testing/model/test-run.ts';

test('TestRun class - basics', () => {
    const testRun = new TestRun();
    assert.deepEqual(testRun, {
        timestamp: 0,
        time: 0,
        status: STATUS.INIT,
        error: null,
        coverage: null
    } as TestRun);
});