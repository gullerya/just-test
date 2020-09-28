import process from 'process';
import Logger from './logger/logger.js';
import { givenConfig, reportEffectiveConfig } from './configurer.js';
import EnvironmentsService from './environments/environments-service.js';
import TestsService from './tests/tests-service.js';
import ServerService from './server/server-service.js';

const logger = new Logger({ context: 'main' });

go();

async function go() {
	let testsService,
		serverService;

	try {
		const environmentsService = new EnvironmentsService(givenConfig.environments, givenConfig.clArguments);
		const environments = environmentsService.environments;

		//	init tester - one for all
		testsService = new TestsService(givenConfig.tests, givenConfig.clArguments);
		reportEffectiveConfig('testsMetadata', testsService.effectiveConfig);
		reportEffectiveConfig('testsResourcesPromise', testsService.testResourcesPromise);

		//	init server - one for all
		serverService = new ServerService(givenConfig.server, givenConfig.clArguments);
		reportEffectiveConfig('serverConfig', serverService.effectiveConfig);
		await serverService.start();

		const envReadyPromises = environmentsService.launch(environments);
		const evnResults = await Promise.all(envReadyPromises);

		evnResults.forEach(er => logger.info(JSON.stringify(er)));

		const executionResult = {};

		logger.info();
		logger.info('tests execution finished normally');
		//	TODO: print summary here
		logger.info('tests status - ' + executionResult.statusText);
		process.exitCode = executionResult.statusPass ? 0 : 1;
	} catch (error) {
		logger.info();
		logger.error('tests execution finished erroneously;', error);
		process.exitCode = 1;
	} finally {
		logger.info('cleaning things...');
		if (serverService && serverService.isRunning) {
			await serverService.stop();
		}
		logger.info('... all clean');
	}
}

	// await new Promise(() => { });

	//	TODO pseudo
	//	if there are tests - start the local server
	//	if non-dev - start browsers (i'll skip this part untill fully manual mode is working)
	//	if dev - do nothing - user will open a browser and will start hacking with the code/tests

	// const
	// 	autServerUrl = conf.server.local
	// 		? httpServer.start(conf.server.port, path.resolve(process.cwd(), conf.server.resourcesFolder))
	// 		: conf.server.remoteUrl,
	// 	testsUrl = autServerUrl + conf.tests.url;

	//	browser
	// logger.info();
	// logger.info(`tests (AUT) URL resolved to "${testsUrl}", launching browsing env...`);
	// const browserRunner = await getBrowserRunner();
	// browser = await browserRunner.launch();
	// logger.info(`... browser env '${browserRunner.name()}' launched`);

	//	general page handling
	// const context = await browser.newContext();
	// const page = await context.newPage();
	// page.on('error', e => {
	// 	logger.error('"error" event fired on page', e);
	// });
	// page.on('pageerror', e => {
	// 	logger.error('"pageerror" event fired on page ', e);
	// })

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
	// logger.info();
	// logger.info('navigating to tests (AUT) URL...');
	// const pageResult = await page.goto(testsUrl);
	// if (pageResult.status() !== 200) {
	// 	throw new Error(`tests (AUT) page gave invalid status ${pageResult.status()}; expected 200`);
	// }
	// logger.info('... tests (AUT) page opened');

	// //	process test results, create report
	// result = await testService.report(page, conf.tests, path.resolve(conf.reports.folder, conf.tests.reportFilename));

	// //	process coverage, create report
	// if (coverageService && coverageService.isCoverageSupported()) {
	// 	await coverageService.stop();
	// 	await coverageService.report(conf.coverage, path.resolve(conf.reports.folder, conf.coverage.reportFilename));
	// }