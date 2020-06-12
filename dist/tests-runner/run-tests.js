import path from 'path';
import Logger from './logger/logger.js';
import { configuration, getBrowserRunner } from './configuration/configurer.js';
import * as localServer from './local-server/local-server.js';
import tester from './tests/tester.js';
import { Coverager } from './coverage/coverager.js';

const
	logger = new Logger('JustTest [main]'),
	conf = configuration;

let browser,
	result;

//	main flow runs here, IIFE used allow async/await
(async () => {
	logger.info('starting JustTest');

	const
		autServerUrl = conf.server.local
			? localServer.start(conf.server.port, path.resolve(process.cwd(), conf.server.resourcesFolder))
			: conf.server.remoteUrl,
		testsUrl = autServerUrl + conf.tests.url;

	//	browser
	logger.info();
	logger.info(`tests (AUT) URL resolved to "${testsUrl}", launching browsing env...`);
	const browserRunner = await getBrowserRunner();
	browser = await browserRunner.launch();
	logger.info(`... browser env '${browserRunner.name()}' launched`);

	//	general page handling
	const context = await browser.newContext();
	const page = await context.newPage();
	page.on('error', e => {
		logger.error('"error" event fired on page', e);
	});
	page.on('pageerror', e => {
		logger.error('"pageerror" event fired on page ', e);
	})

	//	coverage
	let coverager;
	logger.info();
	if (!conf.coverage.skip) {
		coverager = new Coverager(page);
		if (coverager.isCoverageSupported()) {
			await coverager.start();
		}
	}

	//	navigate to tests - this is where the tests are starting to run
	logger.info();
	logger.info('navigating to tests (AUT) URL...');
	const pageResult = await page.goto(testsUrl);
	if (pageResult.status() !== 200) {
		throw new Error(`tests (AUT) page gave invalid status ${pageResult.status()}; expected 200`);
	}
	logger.info('... tests (AUT) page opened');

	//	process test results, create report
	result = await tester.report(page, conf.tests, path.resolve(conf.reports.folder, conf.tests.reportFilename));

	//	process coverage, create report
	if (coverager && coverager.isCoverageSupported()) {
		await coverager.stop();
		await coverager.report(conf.coverage, path.resolve(conf.reports.folder, conf.coverage.reportFilename));
	}
})()
	.then(async () => {
		logger.info();
		logger.info('tests execution finished normally');
		logger.info('tests status - ' + result.statusText);
		await finalizeRun();
		process.exit(result.statusPass ? 0 : 1);
	})
	.catch(async error => {
		logger.info();
		logger.error('tests execution finished erroneously', error);
		await finalizeRun();
		process.exit(1);
	});

async function finalizeRun() {
	logger.info();
	if (browser) {
		logger.info('closing browser...');
		await browser.close();
	}
	if (conf.server.local) {
		logger.info('stopping local server');
		localServer.stop();
	}
	logger.info('done');
}