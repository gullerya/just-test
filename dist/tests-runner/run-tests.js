const
	os = require('os'),
	path = require('path'),
	util = require('util'),
	configurer = require('./configuration/configurer'),
	localServer = require('./local-server/local-server'),
	tester = require('./tests/tester'),
	coverager = require('./coverage/coverager');

let browser,
	result;

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
	const puppeteer = await configurer.getBrowserRunner();
	browser = await puppeteer.launch();
	console.info('JustTest: ... browsing env launched; details (taken by "userAgent") as following');
	console.info(util.inspect(await browser.userAgent(), false, null, true));

	//	general page handling
	const page = await browser.newPage();
	page.on('error', e => {
		console.error('JustTest: "error" event fired on page', e);
	});
	page.on('pageerror', e => {
		console.error('JustTest: "pageerror" event fired on page ', e);
	})

	//	coverage
	console.info(os.EOL);
	if (!conf.coverage.skip) {
		await coverager.start(page);
		console.info('JustTest: JS coverager started');
	} else {
		console.info('JustTest: skipping JS coverage as per configuration');
	}

	//	navigate to tests - this is where the tests are starting to run
	console.info(os.EOL);
	console.info('JustTest: navigating to tests (AUT) URL...');
	const pageResult = await page.goto(testsUrl);
	if (pageResult.status() !== 200) {
		throw new Error('JustTest: tests (AUT) page gave invalid status ' + pageResult.status() + '; expected 200');
	}
	console.info('JustTest: ... tests (AUT) page opened');

	//	process test results, create report
	result = await tester.report(page, conf.tests, path.resolve(conf.reports.folder, conf.tests.reportFilename));

	//	process coverage, create report
	if (!conf.coverage.skip) {
		await coverager.report(page, conf.coverage, path.resolve(conf.reports.folder, conf.coverage.reportFilename));
	}
})()
	.then(async () => {
		console.info(os.EOL);
		console.info('JustTest: tests execution finished normally');
		console.info('JustTest: tests status - ' + result.statusText);
		await finalizeRun();
		process.exit(result.statusPass ? 0 : 1);
	})
	.catch(async error => {
		console.info(os.EOL);
		console.error('JustTest: tests execution finished erroneously', error);
		await finalizeRun();
		process.exit(1);
	});

async function finalizeRun() {
	console.info(os.EOL);
	if (browser) {
		console.info('JustTest: closing browser...');
		await browser.close();
	}
	if (conf.server.local) {
		console.info('JustTest: stopping local server');
		localServer.stop();
	}
	console.info('JustTest: done');
}