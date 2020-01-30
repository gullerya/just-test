import { initComponent, ComponentBase } from '../libs/rich-component/rich-component.min.js';
import '../libs/data-tier-list/data-tier-list.min.js';
import './test-view.js';
import { STATUSES } from '../test.js';

const RESULTS_KEY = Symbol('results.key');
let DND_DATA = null,
	DND_PREVENT_CLICK = false;

initComponent('just-test-view', class extends ComponentBase {
	connectedCallback() {
		this.shadowRoot.querySelector('.header').addEventListener('click', () => {
			if (!DND_PREVENT_CLICK) {
				this.classList.toggle('minimized');
				DND_PREVENT_CLICK = false;
			}
		});
		this.shadowRoot.querySelector('.content').addEventListener('click', e => {
			if (e.target.matches('.suite-view .header .name')) {
				e.target.parentElement.parentElement.classList.toggle('expanded');
			}
		});
		this.shadowRoot.querySelector('.header').onmousedown = e => {
			DND_DATA = {
				self: this,
				startX: e.screenX,
				startY: e.screenY,
				baseX: this.offsetLeft,
				baseY: this.offsetTop
			};
			DND_PREVENT_CLICK = false;
			document.addEventListener('mousemove', this.dragAction);
			document.addEventListener('mouseup', this.dragFinish);
		};
	};

	dragAction(e) {
		if (DND_DATA) {
			DND_PREVENT_CLICK = true;
			DND_DATA.self.shadowRoot.querySelector('.content').classList.add('hidden');
			DND_DATA.self.style.left = DND_DATA.baseX + e.screenX - DND_DATA.startX + 'px';
			DND_DATA.self.style.top = DND_DATA.baseY + e.screenY - DND_DATA.startY + 'px';
		} else {
			document.removeEventListener('mousemove', this.dragAction);
		}
	}

	dragFinish(e) {
		if (DND_DATA) {
			document.removeEventListener('mousemove', this.dragFinish);
			DND_DATA.self.shadowRoot.querySelector('.content').classList.remove('hidden');
			DND_DATA = null;
		}
	}

	set results(results) {
		this[RESULTS_KEY] = results;
	}

	get results() {
		return this[RESULTS_KEY];
	}

	generateXUnitReport() {
		if (!this[RESULTS_KEY]) {
			return null;
		}

		const di = document.implementation;
		const rDoc = di.createDocument(null, 'testsuites');
		this[RESULTS_KEY].suites.forEach(suite => {
			const sEl = rDoc.createElement('testsuite');
			sEl.setAttribute('name', suite.name);
			sEl.setAttribute('time', Math.round(parseFloat(suite.duration)) / 1000);
			sEl.setAttribute('tests', suite.tests.length);
			sEl.setAttribute('errors', suite.tests.filter(t => t.status === STATUSES.ERRORED).length);
			sEl.setAttribute('failures', suite.tests.filter(t => t.status === STATUSES.FAILED).length);
			sEl.setAttribute('skip', suite.tests.filter(t => t.status === STATUSES.SKIPPED).length);
			suite.tests.forEach(test => {
				const tEl = rDoc.createElement('testcase');
				tEl.setAttribute('name', test.name);
				tEl.setAttribute('time', Math.round(test.duration) / 1000);
				if (test.status === STATUSES.ERRORED) {
					const eEl = rDoc.createElement('error');
					if (test.error) {
						eEl.setAttribute('type', test.error.type);
						eEl.setAttribute('message', test.error.message);
						eEl.textContent = test.error.stack;
					}
					tEl.appendChild(eEl);
				} else if (test.status === STATUSES.FAILED) {
					const eEl = rDoc.createElement('failure');
					if (test.error) {
						eEl.setAttribute('type', test.error.type);
						eEl.setAttribute('message', test.error.message);
						eEl.textContent = test.error.stack;
					}
					tEl.appendChild(eEl);
				} else if (test.status === STATUSES.SKIPPED) {
					const eEl = rDoc.createElement('skipped');
					tEl.appendChild(eEl);
				}
				sEl.appendChild(tEl);
			});
			rDoc.documentElement.appendChild(sEl);
		});
		return new XMLSerializer().serializeToString(rDoc);
	}

	static get htmlUrl() {
		return import.meta.url.replace(/js$/, 'htm');
	}
});