const
	os = require('os'),
	{ performance } = require('perf_hooks');

module.exports = {
	report: report
}

async function report(page, testsConf) {
	//	wait for tests to finish
	await waitTestsToFinish(page, testsConf.ttl);

	//	extract results
	console.info(os.EOL);
	console.info('JustTest: obtaining test results...')
	const jt = (await page.$$('just-test-view'))[0];
	const model = await jt.getProperty('model');
	const props = await model.getProperties();
	const result = await (await jt.getProperty('model')).jsonValue();

	console.info('passed: ' + result.passed);
	console.info('failed: ' + result.failed);
	console.info('skipped: ' + result.skipped);
}

async function waitTestsToFinish(page, ttl) {
	const started = performance.now();
	let testsDone = false;

	console.info(os.EOL);
	console.info('JustTest: waiting for tests to finish (max TTL set to ' + Math.floor(ttl / 1000) + 's)...');
	do {
		const elems = await page.$$('just-test-view');
		if (elems.length) {
			testsDone = await (await elems[0].getProperty('done')).jsonValue();
		}

		const currentTL = performance.now() - started;
		if (testsDone) {
			console.info('JustTest: ... tests run finished in ' + Math.floor(currentTL / 1000) + 's');
		} else if (currentTL > ttl) {
			console.error('JustTest: ... max tests run TTL was set to ' + ttl + 'ms, but already passed ' + Math.floor(currentTL / 1000) + 's - abandoning')
			throw new Error('tests run timeed out after ' + Math.floor(currentTL / 1000) + 's');
		}
	} while (!testsDone);
}