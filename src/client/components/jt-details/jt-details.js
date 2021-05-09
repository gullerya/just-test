import { initComponent, ComponentBase } from 'rich-component';
import { lookupEnv } from '../../services/deploy-service.js';
import '../jt-error/jt-error.js';

initComponent('jt-details', class extends ComponentBase {
	set data(selectedTest) {
		if (!selectedTest) {
			return;
		}
		const env = lookupEnv(selectedTest.id);
		if (!env) {
			return;
		}
		const currentView = this.shadowRoot.querySelector('.output > *');
		if (currentView) {
			document.body.appendChild(currentView);
		}
		this.shadowRoot.querySelector('.output').appendChild(env);
	}

	static get htmlUrl() {
		return import.meta.url.replace(/js$/, 'htm');
	}
});