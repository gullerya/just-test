import fs from 'node:fs';
import inspector from 'node:inspector';
import process from 'node:process';
import url from 'node:url';
import { workerData, parentPort } from 'node:worker_threads';
import { EXECUTION_MODES, installExecutionContext } from '../../environment-config.js';

const envConfig = workerData;

const session = new inspector.Session();
session.connect();
session.post('Profiler.enable', (err1) => {
	if (err1) {
		console.error(err1);
	}

	session.post('Profiler.startPreciseCoverage', { callCount: true, detailed: true }, (err2) => {
		if (err2) {
			console.error(err2);
		}

		process.once('beforeExit', () => {
			session.post('Profiler.takePreciseCoverage', (err3, coverage) => {
				if (err3) {
					console.error(err3);
				}

				const cov = coverage.result.filter(entry => {
					return !entry.url.startsWith('node') &&
						!entry.url.includes('node_modules');
				});
				fs.writeFileSync('./reports/cov.json', JSON.stringify(cov));
			});
		});

		installExecutionContext(EXECUTION_MODES.TEST, null, parentPort, envConfig.testId);
		import(url.pathToFileURL(envConfig.testSource));

	});
});