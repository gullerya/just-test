import { initComponent, ComponentBase } from '/libs/rich-component/dist/rich-component.min.js';
import { RESULT } from '../../commons/interop-utils.js';

const TEST_KEY = Symbol('test.key');
const STATUS = Object.freeze({
	PENDING: 'pending',
	RUNNING: 'running',
	FINISHED: 'finished'
});

initComponent('just-test-test', class extends ComponentBase {
	connectedCallback() {
		this.shadowRoot.querySelector('.header > .error-type').addEventListener('click', () => {
			this.classList.toggle('errorOpen');
		});
		this.shadowRoot.querySelector('.re-run').addEventListener('click', () => {
			if (this[TEST_KEY].status !== STATUS.RUNNING) {
				delete this[TEST_KEY].result;
				delete this[TEST_KEY].error;
				delete this[TEST_KEY].start;
				delete this[TEST_KEY].duration;
				//	test(this[TEST_KEY]);
			}
		});
	}

	set test(test) {
		this[TEST_KEY] = test;
		this.shadowRoot.querySelector('.name').textContent = test.name;
		this.status = test.status;
	}

	set duration(duration) {
		let ds = '';
		if (typeof duration === 'number') {
			if (duration > 99) ds = (duration / 1000).toFixed(1) + ' s' + String.fromCharCode(160);
			else if (duration > 59900) ds = (duration / 60000).toFixed(1) + ' m' + String.fromCharCode(160);
			else ds = duration.toFixed(1) + ' ms';
		}
		this.shadowRoot.querySelector('.duration').textContent = ds;
	}

	set status(status) {
		let newState;
		this.classList.remove('wait', 'runs', 'pass', 'fail', 'skip');
		if (status === STATUS.PENDING) {
			newState = 'wait';
		} else if (status === STATUS.RUNNING) {
			newState = 'runs';
		} else if (status === RESULT.PASS) {
			newState = 'pass';
		} else if (status === RESULT.FAIL || status === RESULT.ERROR) {
			newState = 'fail';
		} else if (status === RESULT.SKIP) {
			newState = 'skip';
		}
		setTimeout(() => {
			this.classList.remove('wait', 'runs', 'pass', 'fail', 'skip');
			this.classList.add(newState);
		}, 0);
	}

	set error(error) {
		const ett = this.shadowRoot.querySelector('.error-type');
		const ee = this.shadowRoot.querySelector('.error');
		ett.textContent = '';
		ee.innerHTML = '';
		if (error) {
			if (error instanceof Error) {
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

				ett.textContent = error.type;
				ee.appendChild(df);
			} else {
				ee.textContent = error;
			}
		}
	}

	static get htmlUrl() {
		return import.meta.url.replace(/js$/, 'htm');
	}
});