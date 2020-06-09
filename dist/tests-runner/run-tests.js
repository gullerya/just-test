import os from 'os';
import path from 'path';
import { configuration, getBrowserRunner } from './configuration/configurer.js';
import * as localServer from './local-server/local-server.js';
import tester from './tests/tester.js';
import coverager from './coverage/coverager.js';

let browser,
	result;

//	configuration
const conf = configuration;

//	main flow runs here, IIF used allow async/await
(async () => {
	const
		autServerUrl = conf.server.local
			? localServer.start(conf.server.port, path.resolve(process.cwd(), conf.server.resourcesFolder))
			: conf.server.remoteUrl,
		testsUrl = autServerUrl + conf.tests.url;

	//	browser
	console.info(os.EOL);
	console.info(`JustTest: tests (AUT) URL resolved to "${testsUrl}", launching browsing env...`);
	const browserRunner = await getBrowserRunner();
	browser = await browserRunner.launch();
	console.info(`JustTest: ... browser env '${browserRunner.name()}' launched`);

	//	general page handling
	const context = await browser.newContext();
	const page = await context.newPage();
	page.on('error', e => {
		console.error('JustTest: "error" event fired on page', e);
	});
	page.on('pageerror', e => {
		console.error('JustTest: "pageerror" event fired on page ', e);
	})

	//	coverage
	let coverageOn = false;
	console.info(os.EOL);
	if (!conf.coverage.skip) {
		coverageOn = await coverager.start(page);
	}

	//	navigate to tests - this is where the tests are starting to run
	console.info(os.EOL);
	console.info('JustTest: navigating to tests (AUT) URL...');
	const pageResult = await page.goto(testsUrl);
	if (pageResult.status() !== 200) {
		throw new Error(`JustTest: tests (AUT) page gave invalid status ${pageResult.status()}; expected 200`);
	}
	console.info('JustTest: ... tests (AUT) page opened');

	//	process test results, create report
	result = await tester.report(page, conf.tests, path.resolve(conf.reports.folder, conf.tests.reportFilename));

	//	process coverage, create report
	if (coverageOn) {
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