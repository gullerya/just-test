const TOTAL_TESTS = 10;
const suite = globalThis.getSuite(`Test ${TOTAL_TESTS} tests in suite`);


for (let i = 0; i < TOTAL_TESTS; i++) {
	suite.test(`bench no. ${i}`, t => {
		t.assert.strictEqual('a', 'a');
	});
}