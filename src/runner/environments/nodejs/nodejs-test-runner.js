import fs from 'node:fs';
import inspector from 'node:inspector';
import { cwd } from 'node:process';
import url from 'node:url';
import { promisify } from 'node:util';
import { workerData, parentPort } from 'node:worker_threads';
import { EXECUTION_MODES, installExecutionContext } from '../../environment-config.js';
import minimatch from 'minimatch';

const envConfig = workerData;
const isCoverage = Boolean(workerData.coverage);
const currentBase = cwd();
let sessionPostProm;

if (isCoverage) {
	const session = new inspector.Session();
	session.connect();
	sessionPostProm = promisify(session.post).bind(session);

	await sessionPostProm('Profiler.enable')
	await sessionPostProm('Profiler.startPreciseCoverage', { callCount: true, detailed: true });
	globalThis.process.once('beforeExit', async () => {
		const rawCov = await sessionPostProm('Profiler.takePreciseCoverage');
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

		//	TODO: this one we'd like to actually post as part of test results
		fs.writeFileSync(
			`./reports/${envConfig.testId.replaceAll(/\s/g, '_')}.coverage.json`,
			JSON.stringify(fineCov)
		);
	});
}

installExecutionContext(EXECUTION_MODES.TEST, null, parentPort, envConfig.testId);
import(url.pathToFileURL(envConfig.testSource));
