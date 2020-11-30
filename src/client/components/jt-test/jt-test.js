import '../jt-duration/jt-duration.js';
import '../jt-status/jt-status.js';
import { stateService } from '../../services/state/state-service-factory.js';
import { runTest } from '../../services/session-service.js';
import { initComponent, ComponentBase } from '/libs/rich-component/dist/rich-component.min.js';
import { parseTestId } from '../../common/interop-utils.js';

const TEST_KEY = Symbol('test.key');

initComponent('jt-test', class extends ComponentBase {
	connectedCallback() {
		this.addEventListener('click', () => {
			const testId = parseTestId(this[TEST_KEY].id);
			stateService.setSelectedTest(testId[0], testId[1]);
		});
		this.shadowRoot.querySelector('.re-run').addEventListener('click', event => {
			event.stopPropagation();
			runTest(this[TEST_KEY], { interactive: true });
		});
	}

	set test(test) {
		if (!test) {
			return;
		}
		this[TEST_KEY] = test;
	}

	static get htmlUrl() {
		return import.meta.url.replace(/js$/, 'htm');
	}
});