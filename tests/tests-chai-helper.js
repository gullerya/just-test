import * as chai from 'chai';
export const assert = globalThis.chai ? globalThis.chai.assert : chai.assert;

chai.util.addMethod(chai.assert, 'rejects', async (promise, error) => {
    await promise
        .then(() => assert.fail('expected promise to be rejected'))
        .catch(e => {
            assert.include(e.message, error);
        });
});