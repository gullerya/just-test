import '../jt-duration/jt-duration.js';
import '../jt-status/jt-status.js';
import { stateService } from '../../services/state/state-service-factory.js';
import { initComponent, ComponentBase } from '/libs/rich-component/dist/rich-component.min.js';
import { STATUS } from '../../common/constants.js';
import { parseTestId } from '../../common/interop-utils.js';

const TEST_KEY = Symbol('test.key');

initComponent('jt-test', class extends ComponentBase {
	connectedCallback() {
		this.addEventListener('click', () => {
			stateService.setSelectedTest(this._testId[0], this._testId[1]);
		});
		this.shadowRoot.querySelector('.re-run').addEventListener('click', event => {
			event.stopPropagation();
			if (this[TEST_KEY].status !== STATUS.RUNS) {
				delete this[TEST_KEY].result;
				delete this[TEST_KEY].error;
				delete this[TEST_KEY].start;
				delete this[TEST_KEY].duration;
				// test(this[TEST_KEY]);
			}
		});
	}

	set testId(testId) {
		if (!testId) {
			return;
		}
		this._testId = parseTestId(testId);
	}

	set error(error) {
		return;
		const ee = this.shadowRoot.querySelector('.error');
		if (error) {
			ee.classList.remove('hidden');
			ee.innerHTML = '';
			if (error.type && error.message) {
				const df = new DocumentFragment();

				//	error title
				const et = document.createElement('div');
				et.textContent = error.type + ' - ' + error.message;
				df.appendChild(et);

				//	error lines
				error.stackLines
					.map(l => {
						const el = document.createElement('div');
						el.classList.add('error-line');
						el.textContent = l;
						return el;
					})
					.forEach(el => df.appendChild(el));

				et.textContent = error.type;
				ee.appendChild(df);
			} else {
				ee.textContent = error;
			}
		} else {
			ee.classList.add('hidden');
		}
	}

	static get htmlUrl() {
		return import.meta.url.replace(/js$/, 'htm');
	}
});