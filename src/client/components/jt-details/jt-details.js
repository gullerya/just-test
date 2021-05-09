import { initComponent, ComponentBase } from 'rich-component';
import { lookupEnv } from '../../services/deploy-service.js';
import '../jt-error/jt-error.js';

initComponent('jt-details', class extends ComponentBase {
	set data(selectedTest) {
		if (!selectedTest) {
			return;
		}

		const viewContainer = this.shadowRoot.querySelector('.output');
		const oldView = viewContainer.firstElementChild;
		const newView = lookupEnv(selectedTest.id);

		if (newView === oldView) {
			return;
		}
		if (oldView) {
			document.body.appendChild(oldView);
		}
		if (newView) {
			viewContainer.appendChild(newView);
		}
	}

	static get htmlUrl() {
		return import.meta.url.replace(/js$/, 'htm');
	}
});