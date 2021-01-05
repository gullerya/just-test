import fs from 'fs';
import { STATUS } from '../../../client/common/constants.js';
import { getDOMImplementation } from '../../common/xml/dom-implementation.js';

export default Object.freeze({
	type: 'xUnit',
	report: report
});

function report(results, reportPath) {
	const DOMImplementation = getDOMImplementation();
	const rDoc = DOMImplementation.instance.createDocument(null, 'testsuites');

	results.suites.forEach(suite => {
		const sEl = rDoc.createElement('testsuite');
		sEl.setAttribute('name', suite.name);
		sEl.setAttribute('time', Math.round(parseFloat(suite.duration)) / 1000);
		sEl.setAttribute('tests', suite.tests.length);
		//	TODO: separate between the error and the failure
		sEl.setAttribute('failures', suite.tests.filter(t => t.status === STATUS.FAIL).length);
		sEl.setAttribute('errors', suite.tests.filter(t => t.status === STATUS.FAIL).length);
		sEl.setAttribute('skip', suite.tests.filter(t => t.status === STATUS.SKIP).length);
		suite.tests.forEach(test => {
			const tEl = rDoc.createElement('testcase');
			tEl.setAttribute('name', test.name);
			tEl.setAttribute('time', Math.round(test.duration) / 1000);
			if (test.status === STATUS.FAIL) {
				const eEl = rDoc.createElement('error');
				if (test.error) {
					eEl.setAttribute('type', test.error.type);
					eEl.setAttribute('message', test.error.message);
					eEl.textContent = test.error.stack;
				}
				tEl.appendChild(eEl);
			} else if (test.status === STATUS.SKIP) {
				const eEl = rDoc.createElement('skipped');
				tEl.appendChild(eEl);
			}
			sEl.appendChild(tEl);
		});
		rDoc.documentElement.appendChild(sEl);
	});

	const reportText = new DOMImplementation.XMLSerializer().serializeToString(rDoc);
	fs.writeFileSync(reportPath, reportText, { encoding: 'utf-8' });
}