import 'data-tier-list';
import './components/jt-header/jt-header.js';
import './components/jt-suite/jt-suite.js';
import './components/jt-details/jt-details.js';

import { EVENT } from '/core/common/constants.js';
import { parseTestId } from '/core/common/interop-utils.js';
import { loadMetadata, execute } from '/core/client/main.js';
import { runTest } from '/core/client/session-service.js';
import stateService from './interactive-state-service.js';

(async () => {
	const metadata = await loadMetadata();
	setupUserEvents(metadata);
	await execute(metadata, stateService);
	console.log('continue in interactive mode');
})();

function setupUserEvents(metadata) {
	const suitesList = document.querySelector('.suites-list');
	suitesList.addEventListener(EVENT.TEST_SELECT, e => {
		const [sid, tid] = parseTestId(e.detail.testId);
		stateService.setSelectedTest(sid, tid);
	});
	suitesList.addEventListener(EVENT.TEST_RERUN, e => {
		const [sid, tid] = parseTestId(e.detail.testId);
		const test = stateService.getTest(sid, tid);
		runTest(test, metadata, stateService);
		stateService.setSelectedTest(sid, tid);
	});
}