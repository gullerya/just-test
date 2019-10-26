const
	os = require('os'),
	path = require('path'),
	util = require('util'),
	{ performance } = require('perf_hooks'),
	puppeteer = require('puppeteer'),
	configurer = require('./configuration/configurer'),
	localServer = require('./local-server/local-server'),
	coverager = require('./coverage/coverager');

let
	browser,
	testResults = {};

//	configuration
const conf = configurer.configuration;

//	main flow runs here, IIF used allow async/await
(async () => {
	const
		autServerUrl = conf.server.local
			? localServer.launch(conf.server.port, path.resolve(process.cwd(), conf.server.resourcesFolder))
			: conf.server.remoteUrl,
		testsUrl = autServerUrl + conf.tests.url;

	//	browser
	console.info(os.EOL);
	console.info('JustTest: tests (AUT) URL resolved to "' + testsUrl + '", launching browsing env...');
	browser = await puppeteer.launch(), browserDetails = await browser.userAgent();
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
	const pageResult = await page.goto(testsUrl);
	if (pageResult.status() !== 200) {
		throw new Error('JustTest: tests (AUT) page gave invalid status ' + pageResult.status() + '; expected 200');
	}
	console.info('JustTest: ... tests (AUT) page opened, we are in bussiness :)');

	//	wait till all of the tests settled (no running classes)
	await waitTestsToFinish(page, conf.tests.ttl);

	//	analyze test results, create report
	await processTestResults(page);

	//	process coverage, create report
	if (!conf.coverage.skip) {
		await coverager.report(page, conf.coverage, conf.reportsFolder, autServerUrl);
	}
})()
	.then(async () => {
		console.info(os.EOL);
		console.info('JustTest: tests run finished normally');
		await finalizeRun();
		process.exit(testResults.failed ? 1 : 0);
	})
	.catch(async error => {
		console.info(os.EOL);
		console.error('JustTest: tests run finished erroneously', error);
		await finalizeRun();
		process.exit(1);
	});

async function waitTestsToFinish(page, ttl) {
	let started = performance.now(),
		testsDone;

	console.info(os.EOL);
	console.info('JustTest: start waiting for tests to finish (max TTL set to ' + ttl + 'ms)...');
	do {
		const elems = await page.$$('just-test-view');
		if (elems.length) {
			testsDone = await (await elems[0].getProperty('done')).jsonValue();
		}
		const currentTL = performance.now() - started;
		if (currentTL > ttl) {
			console.error('JustTest: ... max tests run TTL was set to ' + ttl + 'ms, but already running for ' + Math.floor(currentTL) + 'ms, abandoning')
			throw new Error('tests run timeout');
		}
		if (testsDone) {
			console.info('JustTest: ... tests run finished in ' + Math.floor(currentTL) + 'ms');
		}
	} while (!testsDone);

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

async function finalizeRun() {
	console.info(os.EOL);
	console.info('JustTest: closing browser...');
	await browser.close();
	if (conf.server.local) {
		console.info('JustTest: stopping local server');
		localServer.stop();
	}
	console.info('JustTest: done');
}