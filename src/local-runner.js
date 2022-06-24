import os from 'node:os';
import fs from 'node:fs';
import util from 'node:util';
import process from 'node:process';
import { start, stop } from './server/cli.js';
import { xUnitReporter } from './testing/testing-service.js';
import { collectTargetSources, lcovReporter } from './coverage/coverage-service.js';
import { buildJTFileCov } from './coverage/model/model-utils.js';

go();

const SESSION_STATUS_POLL_INTERVAL = 137;

async function go() {
	const startTime = globalThis.performance.now();
	const clArguments = parseCLArgs(process.argv);
	console.info(`Starting local run...`);
	console.info(`${'='.repeat(64)}${os.EOL}`);

	let server;
	let sessionResult;
	let endedWithFailure = false;
	try {
		//	TODO: spawn out the server in a separate process
		server = await start();
		sessionResult = await executeSession(server.baseUrl, clArguments);
	} catch (error) {
		console.error(os.EOL);
		console.error(error);
		console.error(os.EOL);
		endedWithFailure = true;
	} finally {
		if (server && server.isRunning) {
			await stop();
		}

		const duration = ((globalThis.performance.now() - startTime) / 1000).toFixed(1);

		console.info(`${os.EOL}${'='.repeat(64)}`);
		console.info(`... local run finished${os.EOL}`);
		if (sessionResult) {
			console.info('TESTS SUMMARY');
			console.info('=============');
			console.info(`TOTAL: ${sessionResult.total}`);
			console.info(`PASSED: ${sessionResult.pass}`);
			console.info(`FAILED: ${sessionResult.fail}`);
			console.info(`ERRORED: ${sessionResult.error}`);
			console.info(`SKIPPED: ${sessionResult.skip}${os.EOL}`);
			console.info(`SESSION SUMMARY: ${endedWithFailure ? 'FAILURE' : 'SUCCESS'} (${duration}s)${os.EOL}`);
			process.exit(0);
		} else {
			console.info(`SESSION SUMMARY: FAILURE (${duration}s)${os.EOL}`);
			process.exit(1);
		}
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
	const sessionDetails = await sendAddSession(serverBaseUrl, config);
	const sessionResult = await waitSessionEnd(serverBaseUrl, sessionDetails);

	//	test report
	xUnitReporter.report(sessionResult, 'reports/results.xml');

	//	coverage report
	const testCoverages = sessionResult.suites
		.flatMap(s => s.tests)
		.map(t => {
			return {
				testId: t.id,
				coverage: t.lastRun.coverage
			};
		});
	const targetSources = await collectTargetSources(config.environments[0].coverage);
	const fileCoverages = await Promise.all(targetSources.map(ts => buildJTFileCov(ts)));
	const covContent = lcovReporter.convert({ testCoverages, fileCoverages });
	if (covContent) {
		fs.writeFileSync('reports/coverage.lcov', covContent, { encoding: 'utf-8' });
	} else {
		fs.rmSync('reports/coverage.lcov', { force: true });
	}

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
	if (!clArguments || !clArguments.config_file || typeof clArguments.config_file !== 'string') {
		throw new Error(`invalid config_file argument (${clArguments?.config_file})`);
	}

	const configText = await util.promisify(fs.readFile)(clArguments.config_file, { encoding: 'utf-8' });
	const result = JSON.parse(configText);
	//	merge with command line arguments

	return result;
}

async function sendAddSession(serverBaseUrl, config) {
	const addSessionUrl = `${serverBaseUrl}/api/v1/sessions`;
	const options = {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(config)
	};

	const response = await fetch(addSessionUrl, options);
	if (response.status !== 201) {
		throw new Error(`failed to create session; status: ${response.status}, message: ${response.statusText}`);
	} else {
		return await response.json();
	}
}

async function waitSessionEnd(serverBaseUrl, sessionDetails) {
	const sessionResultUrl = `${serverBaseUrl}/api/v1/sessions/${sessionDetails.sessionId}/result`;

	//	TODO: add global timeout
	return new Promise(resolve => {
		const p = async () => {
			const response = await fetch(sessionResultUrl);
			if (response.status === 200) {
				resolve(await response.json());
			} else if (response.status === 204) {
				setTimeout(p, SESSION_STATUS_POLL_INTERVAL);
			} else {
				throw new Error(`failed to obtain session status; status: ${response.status}, message: ${response.statusText}`);
			}
		};
		p();
	});
}