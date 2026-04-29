import { test } from '@gullerya/just-test';
import { assert } from '@gullerya/just-test/assert';
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