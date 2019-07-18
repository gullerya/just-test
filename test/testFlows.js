import { createSuite } from '../dist/just-test.js';

const suite = createSuite({ name: 'Test sync/async assets' });

suite.addTest({ name: 'running the flow', timeout: 11000 }, async test => {
	const tmpSuite = createSuite({ title: 'sub suite having tests flows' });

	tmpSuite.addTest({}, it1 => {
		it1.pass('this is passed');
	});

	tmpSuite.addTest({ name: 'not timing out' }, async it2 => {
		await it2.waitMillis(3000);
		it2.pass();
	});

	tmpSuite.addTest({ name: 'to be skipped', skip: true }, () => {
		//	no matter what we have here
	});

	tmpSuite.addTest({ name: 'async - success' }, async it4 => {
		await it4.waitMillis(7000);
		it4.pass('all good');
	});

	tmpSuite.addTest({ name: 'async - fail' }, async test => {
		await test.waitMillis(6000);
		test.fail('this should fail after 6s and not on timeout!');
	});

	tmpSuite.addTest({}, it => {
		it.pass('this is passed');
	});

	let opToCheck = 0;
	tmpSuite.addTest({ name: 'calling "fail" should stop test execution' }, it => {
		it.fail('stopping the test here');
		opToCheck = 10;
	});

	tmpSuite.addTest({ name: 'simple throw exception in test ' }, test => {
		throw new Error('intentional error throw in sync');
	});

	tmpSuite.addTest({ name: 'simple throw exception in async test ' }, async test => {
		throw new Error('intentional error throw in async');
	});

	await tmpSuite.run();

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

	test.pass();
});

suite.run();