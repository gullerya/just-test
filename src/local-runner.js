import os from 'os';
import fs from 'fs';
import util from 'util';
import process from 'process';
import http from 'http';
import { startServer } from './server/server-service.js';

go();

async function go() {
	const clArguments = parseCLArgs(process.argv);
	console.info(`starting local run with arguments:`);
	console.info(`${JSON.stringify(clArguments)}`);
	console.info(`-------${os.EOL}`);

	let server;
	try {
		server = await startServer(clArguments);
		const sessionResult = await executeSessionWithLocalConfig(server.baseUrl, clArguments);
		console.log(sessionResult);
	} catch (error) {
		console.error(os.EOL);
		console.error(error);
		console.error(os.EOL);
		process.exitCode = 1;
	} finally {
		if (server && server.isRunning) {
			await server.stop();
		}
		console.info(`${os.EOL}-------`);
		console.info(`... local run finished`);
	}
}

function parseCLArgs(args) {
	const result = {};
	if (Array.isArray(args)) {
		for (let i = 0; i < args.length; i++) {
			if (args[i].includes('=')) {
				const [key, val] = args[i].split('=');
				if (key in result) {
					throw new Error(`duplicate key '${key}'`);
				}
				result[key] = val;
			}
		}
	}
	return result;
}

async function executeSessionWithLocalConfig(serverBaseUrl, clArguments) {
	const config = await readConfigAndMergeWithCLArguments(clArguments);

	const options = {
		method: 'POST',
		headers: {
			'Content-Type': 'application-json'
		}
	};

	const req = http.request(`${serverBaseUrl}/api/v1/sessions`, options, res => {
		console.log(`STATUS: ${res.statusCode}`);
		console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
		res.setEncoding('utf-8');
		res.on('data', chunk => {
			console.log(`BODY: ${chunk}`);
		});
		res.on('end', () => {
			console.log('No more data in response.');
		});
	});

	req.on('error', e => {
		console.error(`request failed to dispatch: ${e.message}`);
	});

	req.write(JSON.stringify(config));
	req.end();

	return pollForSessionEnd();
}

async function readConfigAndMergeWithCLArguments(clArguments) {
	if (!clArguments || !clArguments.config || typeof clArguments.config !== 'string') {
		throw new Error(`invalid config argument (${clArguments?.config})`);
	}

	const configText = await util.promisify(fs.readFile)(clArguments.config, { encoding: 'utf-8' });
	const result = JSON.parse(configText);
	//	merge with command line arguments

	return result;
}

async function pollForSessionEnd() {
	return new Promise(r => { });
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