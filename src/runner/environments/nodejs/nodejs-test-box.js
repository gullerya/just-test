import { Session } from 'node:inspector';
import { cwd } from 'node:process';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import minimatch from 'minimatch';
import { workerData, parentPort as sessionRunnerPort } from 'node:worker_threads';
import { EXECUTION_MODES, installExecutionContext } from '../../environment-config.js';
import { EVENT } from '../../../common/constants.js';
import { convertJSCoverage } from '../../../server/coverage/coverage-service.js';

const envConfig = workerData;
const isCoverage = Boolean(workerData.coverage);
const eventBus = new MessageChannel();
const currentBase = cwd();

let sessionPost;

if (isCoverage) {
	sessionPost = await setupCoverage();
}

eventBus.port1.on('message', processRunnerMessage);
eventBus.port1.on('messageerror', processMessageError);
eventBus.port1.unref();

installExecutionContext(EXECUTION_MODES.TEST, eventBus.port2, envConfig.testId);
import(pathToFileURL(envConfig.testSource));

//
// internal methods
//
async function processRunnerMessage(message) {
	if (message.type === EVENT.RUN_STARTED) {
		sessionRunnerPort.postMessage(message);
	} else if (message.type === EVENT.RUN_ENDED) {
		if (isCoverage) {
			const coverage = await collectCoverage();
			const jtCoverage = convertJSCoverage(coverage);
			message.run.coverage = jtCoverage;
		}
		sessionRunnerPort.postMessage(message);
	}
}

function processMessageError(messageError) {
	console.log(`messaging error: ${messageError}`);
}

//	TODO: consider to move to coverage service
async function setupCoverage() {
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
	const fineCov = rawCov.result.filter(entry => {
		let result = false;

		entry.url = '.' + entry.url.substring(entry.url.indexOf(currentBase) + currentBase.length);

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