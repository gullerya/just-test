import os from 'os';
import fs from 'fs';
import util from 'util';
import process from 'process';
import * as http from 'http';
import { start, stop } from './server/server-service.js';
import { ready as perfReady } from './common/performance-utils.js';
import { xUnitReporter } from './server/testing/testing-service.js';
import { lcovReporter } from './server/coverage/coverage-service.js';

go();

const SESSION_STATUS_POLL_INTERVAL = 1237;

async function go() {
	const P = await perfReady;
	const startTime = P.now();
	const clArguments = parseCLArgs(process.argv);
	console.info(`starting local run with arguments:`);
	console.info(`${JSON.stringify(clArguments)}`);
	console.info(`-------${os.EOL}`);

	let server;
	let sessionResult;
	try {
		server = await start(clArguments);
		sessionResult = await executeSession(server.baseUrl, clArguments);
	} catch (error) {
		console.error(os.EOL);
		console.error(error);
		console.error(os.EOL);
		process.exitCode = 1;
	} finally {
		if (server && server.isRunning) {
			await stop();
		}

		const endTime = P.now();
		console.info(`${os.EOL}-------`);
		console.info(`... local run finished${os.EOL}`);
		console.info('TESTS SUMMARY:');
		console.info('========');
		console.info(`TOTAL: ${sessionResult.total}`);
		console.info(`PASSED: ${sessionResult.pass}`);
		console.info(`FAILED: ${sessionResult.fail}`);
		console.info(`ERRORED: ${sessionResult.error}`);
		console.info(`SKIPPED: ${sessionResult.skip}${os.EOL}`);
		console.info(`SESSION SUMMARY: ${process.exitCode ? 'FAILURE' : 'SUCCESS'} (${((endTime - startTime) / 1000).toFixed(1)}s)${os.EOL}`);
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

async function executeSession(serverBaseUrl, clArguments) {
	const config = await readConfigAndMergeWithCLArguments(clArguments);
	const sessionDetails = await sentAddSession(serverBaseUrl, config);
	const sessionResult = await waitSessionEnd(serverBaseUrl, sessionDetails);
	xUnitReporter.report(sessionResult, 'reports/results.xml');
	fs.writeFileSync('reports/coverage.lcov',
		lcovReporter.convert(
			sessionResult.suites.flatMap(s => s.tests).map(t => {
				return {
					id: t.id,
					coverage: t.lastRun.coverage
				};
			})
		)
	);

	//	analysis
	//	TODO: this should be externalized
	const maxFail = config.environments[0].tests.maxFail;
	const maxSkip = config.environments[0].tests.maxSkip;
	if ((sessionResult.fail + sessionResult.error) > maxFail) {
		console.error(`failing due to too many failures/errors; max allowed: ${maxFail}, found: ${sessionResult.fail + sessionResult.error}`);
		process.exitCode = 1;
	} else if (sessionResult.skip > maxSkip) {
		console.error(`failing due to too many skipped; max allowed: ${maxSkip}, found: ${sessionResult.skip}`);
		process.exitCode = 1;
	}

	return sessionResult;
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

async function sentAddSession(serverBaseUrl, config) {
	const addSessionUrl = `${serverBaseUrl}/api/v1/sessions`;
	const options = {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		}
	};
	const body = JSON.stringify(config);

	return new Promise((resolve, reject) => {
		http
			.request(addSessionUrl, options, res => {
				if (res.statusCode !== 201) {
					reject(new Error(`failed to create session; status: ${res.statusCode}, message: ${res.statusMessage}`));
				} else {
					let data = '';
					res.setEncoding('utf-8');
					res.on('error', reject);
					res.on('data', chunk => data += chunk);
					res.on('end', () => resolve(JSON.parse(data)));
				}
			})
			.on('error', reject)
			.end(body);
	});
}

async function waitSessionEnd(serverBaseUrl, sessionDetails) {
	const sessionResultUrl = `${serverBaseUrl}/api/v1/sessions/${sessionDetails.sessionId}/result`;
	const options = {
		method: 'GET',
		headers: {
			'Accept': 'application/json'
		}
	};

	//	TODO: add global timeout
	return new Promise((resolve, reject) => {
		const p = () => {
			http
				.request(sessionResultUrl, options, res => {
					let done = false;
					if (res.statusCode !== 200) {
						console.error(os.EOL);
						console.error(`unexpected session result response; status: ${res.statusCode}, message: ${res.statusMessage}`);
						console.error(os.EOL);
					} else {
						let data = '';
						res.setEncoding('utf-8');
						res.on('data', chunk => data += chunk);
						res.on('end', () => {
							if (data) {
								done = true;
								resolve(JSON.parse(data));
							}
						});
					}
					if (!done) {
						setTimeout(p, SESSION_STATUS_POLL_INTERVAL);
					}
				})
				.on('error', reject)
				.end();
		};
		p();
	});
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