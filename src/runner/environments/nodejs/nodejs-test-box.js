import { Session } from 'node:inspector';
import { cwd } from 'node:process';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { minimatch } from 'minimatch';
import { parentPort } from 'node:worker_threads';
import { EXECUTION_MODES, setExecutionContext } from '../../environment-config.js';
import { v8toJustTest } from '../../../coverage/coverage-service.js';
import { EVENT } from '../../../common/constants.js';

const currentBase = pathToFileURL(cwd()).href;
let testName;
let coverageConfig;

parentPort.addEventListener('message', async m => {
	const { testName: tName, testSource, coverage } = m.data;
	testName = tName;
	coverageConfig = coverage;

	if (coverageConfig) {
		sessionPost = await initCoverage();
	}

	setExecutionContext(EXECUTION_MODES.TEST, testName, runStartHandler, runEndHandler);
	try {
		await import(pathToFileURL(testSource));
	} catch (e) {
		console.error(`failed to import test '${testName}':`, e);
		await runEndHandler(testName, { status: 'error', time: 0, timestamp: Date.now(), error: processError(e) });
	}
});

//
// internal methods
//
let sessionPost;
async function runStartHandler(tName) {
	if (tName !== testName) {
		throw new Error(`expected to get result of test '${testName}', but received of '${tName}'`);
	}
	parentPort.postMessage({ type: EVENT.RUN_START, testName });
}

async function runEndHandler(tName, run) {
	if (tName !== testName) {
		throw new Error(`expected to get result of test '${testName}', but received of '${tName}'`);
	}
	if (coverageConfig) {
		try {
			const coverage = await collectCoverage();
			run.coverage = await v8toJustTest(coverage);
		} catch (e) {
			console.error(`failed to collect coverage of '${testName}': ${e}`);
		}
	}
	parentPort.postMessage({ type: EVENT.RUN_END, testName, run });
}

//	TODO: consider to move to coverage service
async function initCoverage() {
	const session = new Session();
	session.connect();
	const sessionPostProm = promisify(session.post).bind(session);

	await sessionPostProm('Profiler.enable');
	await sessionPostProm('Profiler.startPreciseCoverage', { callCount: true, detailed: true });

	return sessionPostProm;
}

//	TODO: consider to move to coverage service
async function collectCoverage() {
	const rawCov = await sessionPost('Profiler.takePreciseCoverage');
	const fineCov = rawCov.result
		.map(entry => {
			let currentBaseIndex = entry.url.indexOf(currentBase);
			const entryUrl = currentBaseIndex < 0
				? ''
				: `.${entry.url.substring(currentBaseIndex + currentBase.length)}`;
			return {
				url: entryUrl,
				functions: entry.functions
			};
		})
		.filter(entry => {
			let result = false;
			if (!entry.url) {
				return result;
			}

			for (const ig of coverageConfig.include) {
				const m = minimatch(entry.url, ig, {
					ignore: coverageConfig.exclude
				});

				result = result || m;
			}

			return result;
		});

	return fineCov;
}

//	TODO: move to common utils, it's a duplicate of src/runner/just-test.js
function processError(error) {
	const cause = error.cause ? processError(error.cause) : undefined;
	const stacktrace = error.stack.split(/\r\n|\r|\n/)
		.map(l => l.trim())
		.filter(Boolean);

	return {
		name: error.name,
		type: error.constructor.name,
		message: error.message,
		cause,
		stacktrace
	};
}