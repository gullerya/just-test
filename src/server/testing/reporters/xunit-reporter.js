import fs from 'node:fs';
import { STATUS } from '../../../common/constants.js';
import { getDOMImplementation } from '../../../common/xml/dom-implementation.js';

export default Object.freeze({
	type: 'xUnit',
	report: report
});

function report(results, reportPath) {
	const DOMImplementation = getDOMImplementation();

	const rDoc = DOMImplementation.instance.createDocument(null, 'testsuites');
	rDoc.documentElement.setAttribute('timestamp', new Date(results.timestamp).toISOString());
	rDoc.documentElement.setAttribute('time', Math.round(parseFloat(results.time)) / 1000);
	let sessionTests = 0;
	let sessionFailures = 0;
	let sessionErrors = 0;
	let sessionSkips = 0;

	results.suites.forEach(suite => {
		const sEl = rDoc.createElement('testsuite');
		sEl.setAttribute('name', suite.name);
		sEl.setAttribute('timestamp', new Date(suite.timestamp).toISOString());
		sEl.setAttribute('time', Math.round(parseFloat(suite.time)) / 1000);
		sEl.setAttribute('tests', suite.tests.length);
		let suiteFailures = 0;
		let suiteErrors = 0;
		let suiteSkips = 0;

		suite.tests.forEach(test => {
			const lastRun = test.lastRun;
			const tEl = rDoc.createElement('testcase');
			tEl.setAttribute('name', test.name);
			tEl.setAttribute('time', Math.round(lastRun.time) / 1000);
			tEl.setAttribute('status', lastRun.status);

			if (lastRun.status === STATUS.FAIL) {
				suiteFailures++;
				const fEl = rDoc.createElement('failure');
				console.log(lastRun.error);
				if (lastRun.error) {
					fEl.setAttribute('type', lastRun.error.type);
					fEl.setAttribute('message', lastRun.error.message);
					fEl.textContent = lastRun.error.stacktrace;
				}
				tEl.appendChild(fEl);
			} else if (lastRun.status === STATUS.ERROR) {
				suiteErrors++;
				const eEl = rDoc.createElement('error');
				if (lastRun.error) {
					eEl.setAttribute('type', lastRun.error.type);
					eEl.setAttribute('message', lastRun.error.message);
					eEl.textContent = lastRun.error.stacktrace;
				}
				tEl.appendChild(eEl);
			} else if (lastRun.status === STATUS.SKIP) {
				suiteSkips++;
				const eEl = rDoc.createElement('skipped');
				tEl.appendChild(eEl);
			}

			sEl.appendChild(tEl);
		});

		sEl.setAttribute('failures', suiteFailures);
		sEl.setAttribute('errors', suiteErrors);
		sEl.setAttribute('skipped', suiteSkips);

		sessionTests += suite.tests.length;
		sessionFailures += suiteFailures;
		sessionErrors += suiteErrors;
		sessionSkips += suiteSkips;

		rDoc.documentElement.appendChild(sEl);
	});

	rDoc.documentElement.setAttribute('tests', sessionTests);
	rDoc.documentElement.setAttribute('failures', sessionFailures);
	rDoc.documentElement.setAttribute('errors', sessionErrors);
	rDoc.documentElement.setAttribute('skipped', sessionSkips);

	const reportText = new DOMImplementation.XMLSerializer().serializeToString(rDoc);
	fs.writeFileSync(reportPath, reportText, { encoding: 'utf-8' });
}