import process from 'process';
import Logger from './logger/logger.js';
import { givenConfig, reportEffectiveConfig } from './configurer.js';
import EnvironmentsService, { CONSTANTS as E_CONSTANTS } from './environments/environments-service.js';
import TestsService, { CONSTANTS as T_CONSTANTS } from './tests/tests-service.js';
import ServerService, { CONSTANTS as S_CONSTANTS } from './server/server-service.js';

const logger = new Logger({ context: 'main' });

go();

async function go() {
	let testsService,
		serverService;

	try {
		const environmentsService = new EnvironmentsService(givenConfig.environments, givenConfig.clArguments);
		const environments = environmentsService.environments;
		reportEffectiveConfig(E_CONSTANTS.ENVS, environments);

		//	init tester - one for all
		testsService = new TestsService(givenConfig.tests, givenConfig.clArguments);
		reportEffectiveConfig(T_CONSTANTS.TESTS_METADATA, testsService.effectiveConfig);
		reportEffectiveConfig(T_CONSTANTS.TEST_RESOURCES_PROMISE, testsService.testResourcesPromise);

		//	init server - one for all
		serverService = new ServerService(givenConfig.server, givenConfig.clArguments);
		reportEffectiveConfig(S_CONSTANTS.SERVER_CONFIG, serverService.effectiveConfig);
		await serverService.start();

		const envReadyPromises = environmentsService.launch(environments);
		const evnResults = await Promise.all(envReadyPromises);

		evnResults.forEach(er => logger.info(JSON.stringify(er)));

		const executionResult = {};

		logger.info('tests execution finished normally');
		//	TODO: print summary here
		logger.info('tests status - ' + executionResult.statusText);
		process.exitCode = executionResult.statusPass ? 0 : 1;
	} catch (error) {
		logger.error('tests execution finished erroneously', error);
		process.exitCode = 1;
	} finally {
		logger.info('cleaning things...');
		if (serverService && serverService.isRunning) {
			await serverService.stop();
		}
		logger.info('... all clean');
	}
}

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