import { Session } from 'node:inspector';
import { cwd } from 'node:process';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import minimatch from 'minimatch';
import { workerData, parentPort as sessionRunnerPort } from 'node:worker_threads';
import { EXECUTION_MODES, setExecutionContext } from '../../environment-config.js';
import { v8toJustTest } from '../../../coverage/coverage-service.js';
import { EVENT } from '../../../common/constants.js';

const { testName, suiteName, testSource, coverage } = workerData;
const currentBase = pathToFileURL(cwd()).href;

let sessionPost;

if (coverage) {
	sessionPost = await initCoverage();
}

setExecutionContext(EXECUTION_MODES.TEST, testName, runStartHandler, runEndHandler);

await import(pathToFileURL(testSource));

//
// internal methods
//
async function runStartHandler(tName) {
	if (tName !== testName) {
		throw new Error(`expected to get result of test '${testName}', but received of '${tName}'`);
	}
	sessionRunnerPort.postMessage({ type: EVENT.RUN_START, suiteName, testName });
}

async function runEndHandler(tName, run) {
	if (tName !== testName) {
		throw new Error(`expected to get result of test '${testName}', but received of '${tName}'`);
	}
	if (coverage) {
		try {
			const coverage = await collectCoverage();
			run.coverage = await v8toJustTest(coverage);
		} catch (e) {
			console.error(`failed to collect coverage of '${testName}': ${e}`);
		}
	}
	sessionRunnerPort.postMessage({ type: EVENT.RUN_END, suiteName, testName, run });
}

//	TODO: consider to move to coverage service
async function initCoverage() {
	const session = new Session();
	session.connect();
	const sessionPostProm = promisify(session.post).bind(session);

	await sessionPostProm('Profiler.enable')
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

			for (const ig of workerData.coverage.include) {
				const m = minimatch(entry.url, ig, {
					ignore: workerData.coverage.exclude
				});

				result = result || m;
			}

			return result;
		});

	return fineCov;
}