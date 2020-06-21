import os from 'os';
import path from 'path';
import util from 'util';
import { resolveGivenConfig } from './configurer.js';
import Logger from './server/logging/logger.js';
import TestService from './server/testing/tests-service.js';
import HttpService from './server/serving/http-service.js';
import BrowsingService from './server/browsing/browser-service.js';
import CoverageService from './server/coverage/coverage-service.js';

const logger = new Logger('JustTest [main]');

let httpService,
	browser,
	result;

//	main flow runs here, IIFE used allow async/await
(async () => {
	logger.info('starting JustTest');

	const providedConviguration = resolveGivenConfig(process.argv.slice(2));

	logger.info('configuring services');
	httpService = new HttpService(providedConviguration);
	const testService = new TestService(providedConviguration);
	const coverageService = new CoverageService(providedConviguration);

	logger.info('... effective configuration to be used is as following');
	logger.info(util.inspect({
		client: {},
		server: httpService.effectiveConfig,
		tests: testService.effectiveConfig,
		coverage: coverageService.effectiveConfig
	}, false, null, true));
	logger.info();

	// const
	// 	autServerUrl = conf.server.local
	// 		? httpServer.start(conf.server.port, path.resolve(process.cwd(), conf.server.resourcesFolder))
	// 		: conf.server.remoteUrl,
	// 	testsUrl = autServerUrl + conf.tests.url;

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
	// let coverager;
	// logger.info();
	// if (!conf.coverage.skip) {
	// 	coverager = new Coverager(page);
	// 	if (coverager.isCoverageSupported()) {
	// 		await coverager.start();
	// 	}
	// }

	//	navigate to tests - this is where the tests are starting to run
	logger.info();
	logger.info('navigating to tests (AUT) URL...');
	const pageResult = await page.goto(testsUrl);
	if (pageResult.status() !== 200) {
		throw new Error(`tests (AUT) page gave invalid status ${pageResult.status()}; expected 200`);
	}
	logger.info('... tests (AUT) page opened');

	//	process test results, create report
	result = await testService.report(page, conf.tests, path.resolve(conf.reports.folder, conf.tests.reportFilename));

	//	process coverage, create report
	if (coverageService && coverageService.isCoverageSupported()) {
		await coverageService.stop();
		await coverageService.report(conf.coverage, path.resolve(conf.reports.folder, conf.coverage.reportFilename));
	}
})()
	.then(async () => {
		logger.info();
		logger.info('tests execution finished normally');
		logger.info('tests status - ' + result.statusText);
		await cleanup();
		const exitStatus = result.statusPass ? 0 : 1;
		logger.info(`done, exit status ${exitStatus}${os.EOL}`);
		logger.info();
		process.exit(exitStatus);
	})
	.catch(async error => {
		logger.info();
		logger.error('tests execution finished erroneously', error);
		await cleanup();
		logger.info(`done, exit status 1${os.EOL}`);
		process.exit(1);
	});

async function cleanup() {
	logger.info('cleaning things...');
	if (browser) {
		logger.info('closing browser...');
		await browser.close();
	}
	if (httpService && httpService.isRunning()) {
		logger.info('stopping local server');
		httpService.stop();
	}
	logger.info('... clean');
}