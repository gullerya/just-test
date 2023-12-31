import * as chai from 'chai';
export const assert = globalThis.chai ? globalThis.chai.assert : chai.assert;

const util = globalThis.chai ? globalThis.chai.util : chai.util;
util.addMethod(assert, 'rejects', async (promise, error) => {
    await promise
        .then(() => assert.fail('expected promise to be rejected'))
        .catch(e => {
            assert.include(e.message, error);
        });
});