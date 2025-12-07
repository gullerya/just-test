import { Session } from 'node:inspector';
import { cwd } from 'node:process';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { minimatch } from 'minimatch';
import { parentPort } from 'node:worker_threads';
import { EXECUTION_MODES, setExecutionContext } from '../../environment-config.js';
import { v8toJustTest } from '../../../coverage/coverage-service.js';
import { EVENT, STATUS } from '../../../common/constants.js';
import { TestError } from '../../../testing/model/test-error.ts';
import { TestRun } from '../../../testing/model/test-run.ts';

const currentBase = pathToFileURL(cwd()).href;
let testName;
let coverageConfig;

parentPort.addEventListener('message', async (m: MessageEvent) => {
	const { testName: tName, testSource, coverage } = m.data;
	testName = tName;
	coverageConfig = coverage;

	if (coverageConfig) {
		sessionPost = await initCoverage();
	}

	setExecutionContext(EXECUTION_MODES.TEST, testName, runStartHandler, runEndHandler);
	try {
		await import(pathToFileURL(testSource).toString());
	} catch (e) {
		console.error(`failed to import test '${testName}':`, e);
		const run = new TestRun();
		run.status = STATUS.ERROR;
		run.time = 0;
		run.timestamp = Date.now();
		run.error = TestError.fromError(e);
		await runEndHandler(testName, run);
	}
});

//
// internal methods
//
let sessionPost;
async function runStartHandler(tName: string): Promise<void> {
	if (tName !== testName) {
		throw new Error(`expected to get result of test '${testName}', but received of '${tName}'`);
	}
	parentPort.postMessage({ type: EVENT.RUN_START, testName });
}

async function runEndHandler(tName: string, run: TestRun): Promise<void> {
	if (tName !== testName) {
		throw new Error(`expected to get result of test '${testName}', but received of '${tName}'`);
	}
	if (coverageConfig) {
		try {
			const v8Coverage = await collectCoverage();
			const jtCoverage = await v8toJustTest(v8Coverage, undefined);
			run.coverage = jtCoverage;
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
					// ignore: coverageConfig.exclude
				});

				result = result || m;
			}

			return result;
		});

	return fineCov;
}