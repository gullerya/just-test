const suite = globalThis.getSuite('Chai interoperability');

suite.test('assert works - with error expected', test => {
	test.assert.equal(0, 1);
}, {
	expectError: 'expected 0 to equal 1'
});

suite.test('assert works - normal', test => {
	test.assert.equal('some', 'some');
});

suite.test('expect works - with error expected', test => {
	test.expect(false).true;
}, {
	expectError: 'expected false to be true'
});

suite.test('expect works - normal', test => {
	test.expect(false).to.be.false;
});
