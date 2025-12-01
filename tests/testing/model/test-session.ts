import { test } from '../../../src/runner/just-test.js';
import { assert } from '../../../src/common/assert-utils.ts';
import { Session } from '../../../src/testing/model/session.ts';

test('Session class - defaults', () => {
    const session = new Session();
    assert.deepEqual(session, {
        sessionId: 'unspecified',
        environmentId: 'unspecified',
        timestamp: 0,
        time: 0,
        suites: [],
        errors: [],
        total: 0,
        done: 0,
        skip: 0,
        pass: 0,
        fail: 0,
        error: 0,
        onlyMode: false
    } as Session);
});