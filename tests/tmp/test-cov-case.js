import { topLevel } from '/core/common/cov-test.js';

const suite = getSuite('Coverage tests');

suite.test('coveraga a', () => {
	topLevel();
});