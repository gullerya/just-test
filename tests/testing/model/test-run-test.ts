import { test } from '@gullerya/just-test';
import { assert } from '@gullerya/just-test/assert';
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