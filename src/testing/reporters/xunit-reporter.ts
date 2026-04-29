import { STATUS } from '../../common/constants.ts';
import { getDOMImplementation } from '../../common/xml/dom-implementation.ts';

export default Object.freeze({
	type: 'xUnit',
	report: report
});

function report(results) {
	const DOMImplementation: any = getDOMImplementation();

	const rDoc: any = DOMImplementation.instance.createDocument(null, 'testsuites', null);
	rDoc.documentElement.setAttribute('timestamp', new Date(results.timestamp).toISOString());
	rDoc.documentElement.setAttribute('time', millisToSeconds(results.time));
	let sessionTests = 0;
	let sessionFailures = 0;
	let sessionErrors = 0;
	let sessionSkips = 0;

	results.errors.forEach(error => {
		const eEl = rDoc.createElement('error');
		eEl.setAttribute('type', error.type);
		eEl.setAttribute('message', error.message);
		eEl.textContent = error.stack;
		rDoc.documentElement.appendChild(eEl);

		sessionErrors++;
	});

	results.suites.forEach(suite => {
		const sEl = rDoc.createElement('testsuite');
		sEl.setAttribute('name', suite.name);
		sEl.setAttribute('timestamp', new Date(suite.timestamp).toISOString());
		sEl.setAttribute('time', String(millisToSeconds(suite.time)));
		sEl.setAttribute('tests', String(suite.tests.length));
		let suiteFailures = 0;
		let suiteErrors = 0;
		let suiteSkips = 0;

		suite.tests.forEach(test => {
			const lastRun = test.lastRun;
			const tEl = rDoc.createElement('testcase');
			tEl.setAttribute('name', test.name);

			if (lastRun) {
				tEl.setAttribute('time', String(millisToSeconds(lastRun.time)));
				tEl.setAttribute('status', lastRun.status);

				if (lastRun.status === STATUS.FAIL) {
					suiteFailures++;
					const fEl = rDoc.createElement('failure');
					console.log(lastRun.error);
					if (lastRun.error) {
						fEl.setAttribute('type', lastRun.error.type);
						fEl.setAttribute('message', lastRun.error.message);
						fEl.textContent = lastRun.error.stack;
					}
					tEl.appendChild(fEl);
				} else if (lastRun.status === STATUS.ERROR) {
					suiteErrors++;
					const eEl = rDoc.createElement('error');
					if (lastRun.error) {
						eEl.setAttribute('type', lastRun.error.type);
						eEl.setAttribute('message', lastRun.error.message);
						eEl.textContent = lastRun.error.stack;
					}
					tEl.appendChild(eEl);
				} else if (lastRun.status === STATUS.SKIP) {
					suiteSkips++;
					const eEl = rDoc.createElement('skipped');
					tEl.appendChild(eEl);
				}
			}


			sEl.appendChild(tEl);
		});

		sEl.setAttribute('failures', String(suiteFailures));
		sEl.setAttribute('errors', String(suiteErrors));
		sEl.setAttribute('skips', String(suiteSkips));

		sessionTests += suite.tests.length;
		sessionFailures += suiteFailures;
		sessionErrors += suiteErrors;
		sessionSkips += suiteSkips;

		rDoc.documentElement.appendChild(sEl);
	});

	rDoc.documentElement.setAttribute('tests', sessionTests);
	rDoc.documentElement.setAttribute('failures', sessionFailures);
	rDoc.documentElement.setAttribute('errors', sessionErrors);
	rDoc.documentElement.setAttribute('skips', sessionSkips);

	return new DOMImplementation.XMLSerializer().serializeToString(rDoc);
}

function millisToSeconds(milliseconds, maxPrecision = 4) {
	return parseFloat((milliseconds / 1000).toFixed(maxPrecision));
}