import { initComponent, ComponentBase } from 'rich-component';
import { lookupEnv } from '/core/runner/deploy-service.js';
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

		//	TODO: move this login to deploy service? (it knows how the iframes created)
		//	TODO: do NOT move the whole iframe, causes tests duplicate execution, but only an HTML? body?
		if (oldView) {
			//document.body.appendChild(oldView);
		}
		if (newView) {
			//viewContainer.appendChild(newView);
		}
	}

	static get htmlUrl() {
		return import.meta.url.replace(/js$/, 'htm');
	}
});