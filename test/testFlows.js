import { createSuite } from '../dist/just-test.js';

const suite = createSuite({ name: 'Test sync/async assets' });

suite.runTest({ name: 'running the flow', timeout: 11000 }, async test => {
	const tmpSuite = createSuite({ title: 'sub suite having tests flows' });

	//	sync tests
	//
	tmpSuite.runTest('sync - pass', () => { });

	tmpSuite.runTest({ name: 'sync - skip', skip: true }, () => { });

	tmpSuite.runTest('sync - fail by false', () => {
		return false;
	});

	tmpSuite.runTest('sync - fail by Error', () => {
		throw new Error('some error');
	});

	tmpSuite.runTest('sync - fail by Error from assert', t => {
		t.assertEqual('this is', 'wrong');
	});

	//	async
	//
	tmpSuite.runTest({ name: 'async - pass' }, async t => {
		await t.waitMillis(3000);
	});

	tmpSuite.runTest({ name: 'async - skip so no effect of async', skip: true }, async t => {
		await t.waitMillis(3000);
	});

	tmpSuite.runTest('async - fail by false', async t => {
		await t.waitMillis(6000);
		return false;
	});

	tmpSuite.runTest('async - fail by Error', async t => {
		await t.waitMillis(6000);
		throw new Error('fail by error');
	});

	tmpSuite.runTest('async - fail by Error from assert', async t => {
		await t.waitMillis(6000);
		t.assertTrue(false);
	});

	let opToCheck = 0;
	tmpSuite.runTest('failing assert should stop test execution', t => {
		t.assertTrue(false);
		opToCheck = 10;
	});

	await tmpSuite.done();

	const tests = tmpSuite.tests;

	test.assertTrue(tests[1].duration > 3000);
	test.assertTrue(!tests[2].start && !tests[2].end && tests[2].duration === null);
	test.assertEqual(tests[3].start + tests[3].duration, tests[3].end);
	test.assertTrue(tests[3].start < tests[4].start);
	test.assertTrue(tests[4].start < tests[5].start)
	test.assertTrue(tests[3].end > tests[4].start);
	test.assertTrue(tests[4].end > tests[5].start);

	//	erroneous exists
	test.assertEqual(tests[7].status, 'fail');
	test.assertTrue(tests[7].duration < 3);
	test.assertEqual(tests[8].status, 'fail');
	test.assertTrue(tests[8].duration < 3);

	test.assertEqual(opToCheck, 0);
});