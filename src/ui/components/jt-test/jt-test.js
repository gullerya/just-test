import '../jt-duration/jt-duration.js';
import '../jt-status/jt-status.js';
import { initComponent, ComponentBase } from 'rich-component';
import { EVENT } from '/core/common/constants.js';

const TEST_KEY = Symbol('test.key');

initComponent('jt-test', class extends ComponentBase {
	connectedCallback() {
		this.addEventListener('click', () => this._notifySelected());
		this.shadowRoot.querySelector('.re-run').addEventListener('click', () => this._notifyRerun());
	}

	set test(test) {
		if (!test) {
			return;
		}
		this[TEST_KEY] = test;
	}

	_notifySelected() {
		const detail = {
			testId: this[TEST_KEY].id
		};
		const selectEvent = new CustomEvent(EVENT.TEST_SELECT, {
			bubbles: true,
			composed: true,
			detail: detail
		});
		this.dispatchEvent(selectEvent);
	}

	_notifyRerun() {
		const detail = {
			testId: this[TEST_KEY].id
		};
		const selectEvent = new CustomEvent(EVENT.TEST_RERUN, {
			bubbles: true,
			composed: true,
			detail: detail
		});
		this.dispatchEvent(selectEvent);
	}

	static get htmlUrl() {
		return import.meta.url.replace(/js$/, 'htm');
	}
});