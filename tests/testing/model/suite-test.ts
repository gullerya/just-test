import { test } from '@gullerya/just-test';
import { assert } from '@gullerya/just-test/assert';
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