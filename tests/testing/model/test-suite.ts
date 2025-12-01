import { test } from '../../../src/runner/just-test.js';
import { assert } from '../../../src/common/assert-utils.ts';
import { Suite } from '../../../src/testing/model/suite.ts';

test('Suite class - defaults', () => {
    const suite = new Suite();
    assert.deepEqual(suite, {
        id: 'unspecified',
        name: 'unspecified',
        config: {},
        timestamp: 0,
        time: 0,
        tests: [],
        total: 0,
        done: 0,
        skip: 0,
        pass: 0,
        fail: 0,
        error: 0,
        onlyMode: false
    } as Suite);
});