import 'data-tier-list';
import './components/jt-header/jt-header.js';
import './components/jt-suite/jt-suite.js';
import './components/jt-details/jt-details.js';

import stateService from './interactive-state-service.js';
import { loadMetadata, execute } from '/core/client/main.js';
import { EVENT } from '/core/common/constants.js';
import { parseTestId } from '/core/common/interop-utils.js';

(async () => {
	setupUserEvents();
	const metadata = await loadMetadata();
	await execute(metadata, stateService);
	console.log('continue in interactive mode');
})();

function setupUserEvents(iStateService) {
	document.querySelector('.suites-list').addEventListener(EVENT.TEST_SELECT, e => {
		const [sid, tid] = parseTestId(e.detail.testId);
		iStateService.setSelectedTest(sid, tid);
	});
}