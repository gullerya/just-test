import { initComponent, ComponentBase } from '../libs/rich-component/rich-component.min.js';
import { STATUSES, runTest } from '../test.js';

const TEST_KEY = Symbol('test.key');

initComponent('test-view', class extends ComponentBase {
	connectedCallback() {
		this.shadowRoot.querySelector('.header > .error-type').addEventListener('click', () => {
			this.classList.toggle('errorOpen');
		});
		this.shadowRoot.querySelector('.re-run').addEventListener('click', () => {
			if (this[TEST_KEY].status !== STATUSES.RUNNING) {
				runTest(this[TEST_KEY]);
			} else {
				console.log('running');
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
		if (status === STATUSES.QUEUED) {
			newState = 'wait';
		} else if (status === STATUSES.RUNNING) {
			newState = 'runs';
		} else if (status === STATUSES.PASSED) {
			newState = 'pass';
		} else if (status === STATUSES.FAILED || status === STATUSES.ERRORED) {
			newState = 'fail';
		} else if (status === STATUSES.SKIPPED) {
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