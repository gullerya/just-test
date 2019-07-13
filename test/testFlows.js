import { createSuite } from '../dist/just-test.js';

const suite = createSuite({ name: 'Test sync/async assets' });

suite.addTest({ name: 'running the flow' }, test => {
	const tmpSuite = createSuite({ title: 'sub suite having tests flows' });

	tmpSuite.addTest({}, it1 => {
		it1.pass('this is passed');
	});

	tmpSuite.addTest({ name: 'not timing out' }, it2 => {
		setTimeout(it2.pass, 3000);
	});

	tmpSuite.addTest({ name: 'to be skipped', skip: true }, () => {
		//	no matter what we have here
	});

	tmpSuite.addTest({ name: 'async - success' }, it4 => {
		setTimeout(() => { it4.pass('all good'); }, 7000);
	});

	tmpSuite.addTest({ name: 'async - fail' }, it5 => {
		setTimeout(() => { it5.fail('this should fail after 6s and not on timeout!'); }, 6000);
	});

	tmpSuite.addTest({}, it6 => {
		it6.pass('this is passed');
	});

	const tmpPromise = tmpSuite.run();

	tmpPromise.then(() => {
		const tests = tmpSuite.tests;
		if (tests[1].duration < 3000) test.fail(new Error('expected test to last at least 3000ms'));
		if (tests[2].startTime < tests[1].startTime + 3000) test.fail(new Error('expected test 2 to start after full finish of test 1'));
		if (tests[3].startTime > tests[4].startTime || tests[4].startTime > tests[5].startTime) test.fail(new Error('expected tests to start in sequence'));
		if (tests[3].startTime + tests[3].duration > tests[4].startTime) test.fail(new Error('expected tests 3 and 4 to run in parallel'));
		if (tests[4].startTime + tests[4].duration > tests[5].startTime) test.fail(new Error('expected tests 4 and 5 to run in parallel'));
		test.pass();
	}, function () {
		test.fail();
	});
});

suite.run();