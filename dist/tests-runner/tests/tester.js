const
	os = require('os'),
	{ performance } = require('perf_hooks');

module.exports = {
	report: report
}

async function report(page, conf) {
	//	wait for tests to finish
	await waitTestsToFinish(page, conf.ttl);

	//	extract results
	console.info(os.EOL);
	console.info('JustTest [tester]: obtaining test results...');
	const model = await page.evaluate(() => {
		const mAsJson = document.querySelector('just-test-view').model;
		return JSON.parse(JSON.stringify(mAsJson));
	});
	console.info('JustTest [tester]: ... test results summary:');
	console.info(model.passed.toString().padStart(7) + ' passed');
	console.info(model.failed.toString().padStart(7) + ' failed');
	console.info(model.skipped.toString().padStart(7) + ' skipped');

	const statusPass = model.failed <= conf.maxFail && model.skipped <= conf.maxSkip;
	const result = {
		passed: model.passed,
		failed: model.failed,
		skipped: model.skipped,
		statusPass: statusPass,
		statusText: statusPass
			? 'SUCCESS' + (model.failed || model.skipped ? ' (with allowed no. of fails/skips)' : '')
			: 'FAILURE'
	}

	return result;
}

async function waitTestsToFinish(page, ttl) {
	const started = performance.now();
	let testsDone = false;

	console.info(os.EOL);
	console.info('JustTest [tester]: waiting for tests to finish (max TTL set to ' + Math.floor(ttl / 1000) + 's)...');
	do {
		testsDone = await page.evaluate(() => {
			const jtv = document.querySelector('just-test-view');
			return jtv && jtv.done;
		});

		const currentTL = performance.now() - started;
		if (testsDone) {
			console.info('JustTest [tester]: ... tests run finished in ' + Math.floor(currentTL / 1000) + 's');
		} else if (currentTL > ttl) {
			console.error('JustTest [tester]: ... max tests run TTL was set to ' + ttl + 'ms, but already passed ' + Math.floor(currentTL / 1000) + 's - abandoning')
			throw new Error('tests run timed out after ' + Math.floor(currentTL / 1000) + 's');
		}

		await new Promise(r => r(), 2000);
	} while (!testsDone);
}