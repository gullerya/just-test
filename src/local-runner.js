import os from 'node:os';
import fs from 'node:fs';
import util from 'node:util';
import process from 'node:process';
import { start, stop } from './server/cli.js';
import { xUnitReporter } from './server/testing/testing-service.js';
import { lcovReporter } from './server/coverage/coverage-service.js';

go();

const SESSION_STATUS_POLL_INTERVAL = 137;

async function go() {
	const startTime = globalThis.performance.now();
	const clArguments = parseCLArgs(process.argv);
	console.info(`Starting local run...`);
	console.info(`${'='.repeat(64)}${os.EOL}`);

	let server;
	let sessionResult;
	try {
		server = await start();
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

		const endTime = globalThis.performance.now();
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
			console.info(`SESSION SUMMARY: ${process.exitCode ? 'FAILURE' : 'SUCCESS'} (${((endTime - startTime) / 1000).toFixed(1)}s)${os.EOL}`);
			process.exit(0);
		} else {
			console.info(`SESSION SUMMARY: FAILURE (${((endTime - startTime) / 1000).toFixed(1)}s)${os.EOL}`);
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
	const covContent = lcovReporter.convert(
		sessionResult.suites.flatMap(s => s.tests).map(t => {
			return {
				id: t.id,
				coverage: t.lastRun.coverage
			};
		})
	);
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