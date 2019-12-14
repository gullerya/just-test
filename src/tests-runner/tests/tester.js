const
	os = require('os'),
	fsExtra = require('fs-extra'),
	{ performance } = require('perf_hooks');

module.exports = {
	report: report
}

async function report(page, conf, reportPath) {
	//	wait for tests to finish
	await waitTestsToFinish(page, conf.ttl);

	//	write full report
	console.info(os.EOL);
	console.info('JustTest [tester]: obtaining full report...');
	const fullReport = await page.evaluate(() => {
		return document.querySelector('just-test-view').generateXUnitReport();
	});
	if (fullReport) {
		fsExtra.outputFileSync(reportPath, fullReport);
	}
	console.info('JustTest [tester]: ... full report written ("' + conf.format + '" format)');

	//	extract principal results
	console.info(os.EOL);
	console.info('JustTest [tester]: obtaining test results...');
	const results = await page.evaluate(() => {
		const mAsJson = document.querySelector('just-test-view').results;
		return JSON.parse(JSON.stringify(mAsJson));
	});
	console.info('JustTest [tester]: ... test results summary:');
	console.info(results.passed.toString().padStart(7) + ' passed');
	console.info(results.failed.toString().padStart(7) + ' failed');
	console.info(results.skipped.toString().padStart(7) + ' skipped');

	if (results.failed) {
		console.info(os.EOL);
		results.suites
			.filter(s => s.failed)
			.forEach(s => {
				s.tests
					.filter(t => t.status === 4 || t.status === 5)
					.forEach(t => {
						console.info('Test ' + (t.status === 4 ? 'FAILURE' : 'ERROR') + ':');
						console.info('\tTest: ' + t.name);
						console.info('\tSuite: ' + s.name);
						console.info('\tError: ' + t.error.type + ' - ' + (t.error.message ? t.error.message : 'no message'));
					});
			});
	}

	const statusPass = results.failed <= conf.maxFail && results.skipped <= conf.maxSkip;
	const result = {
		passed: results.passed,
		failed: results.failed,
		skipped: results.skipped,
		statusPass: statusPass,
		statusText: statusPass
			? 'SUCCESS' + (results.failed || results.skipped ? ' (with allowed no. of fails/skips)' : '')
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
			return jtv && jtv.results && typeof jtv.results === 'object';
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