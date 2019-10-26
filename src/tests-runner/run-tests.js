const
	os = require('os'),
	util = require('util'),
	{ performance } = require('perf_hooks'),
	puppeteer = require('puppeteer'),
	configurer = require('./configuration/configurer'),
	localServer = require('./local-server/local-server'),
	coverager = require('./coverage/coverager');

let
	testResults = {};

//	configuration
const conf = configurer.configuration;

//	main flow runs here, IIF used allow async/await
(async () => {
	const
		autServerUrl = conf.server.local
			? localServer.launch(conf.server.port)
			: conf.server.remoteUrl,
		testsUrl = autServerUrl + conf.tests.url;

	//	browser
	console.info(os.EOL);
	console.info('JustTest: tests (AUT) URL resolved to "' + testsUrl + '", launching browsing env...');
	const browser = await puppeteer.launch(), browserDetails = await browser.userAgent();
	console.info('JustTest: ... browsing env launched; details (taken by "userAgent") as following');
	console.info(util.inspect(browserDetails, false, null, true));

	//	general page handling
	const page = await browser.newPage();
	page.on('error', e => {
		console.error('error: ', e);
	});
	page.on('pageerror', e => {
		console.error('pageerror: ', e);
	})

	//	coverage
	if (!conf.coverage.skip) {
		await coverager.start(page);
		console.info(os.EOL);
		console.info('JustTest: JS coverager started');
	}

	//	navigate to tests - this is where the tests are starting to run
	console.info(os.EOL);
	console.info('JustTest: navigating to tests (AUT) URL...');
	await page.goto(testsUrl);
	console.info('JustTest: ... tests (AUT) page opened, we are in bussiness :)');

	//	wait till all of the tests settled (no running classes)
	await waitTestsToFinish(page);

	//	analyze test results, create report
	await processTestResults(page);

	//	process coverage, create report
	if (!conf.coverage.skip) {
		await coverager.report(page, conf.coverage, conf.reportsFolder, autServerUrl);
	}
})()
	.then(() => {
		console.info('test suite/s DONE');
		process.exit(testResults.failed ? 1 : 0);
	})
	.catch(error => {
		console.error('test suite/s run DONE (with error)', error);
		process.exit(1);
	})
	.finally(() => {
		browser.close();
		localServer.stop();
	});

async function waitTestsToFinish(page) {
	let started = performance.now(),
		testsDone;

	console.info('waiting for tests to finish...');
	do {
		const elems = await page.$$('just-test-view');
		if (elems.length) {
			testsDone = await (await elems[0].getProperty('done')).jsonValue();
		}
	} while (!testsDone);

	if (testsDone) {
		console.info('tests done in ' + (performance.now() - started) + 'ms');
	} else {
		console.error('timed out after ' + (performance.now() - started) + 'ms');
	}
}

async function processTestResults(page) {
	const jt = (await page.$$('just-test-view'))[0];
	testResults.passed = await (await jt.getProperty('passed')).jsonValue();
	testResults.failed = await (await jt.getProperty('failed')).jsonValue();
	testResults.skipped = await (await jt.getProperty('skipped')).jsonValue();

	console.info('passed: ' + testResults.passed);
	console.info('failed: ' + testResults.failed);
	console.info('skipped: ' + testResults.skipped);
}
