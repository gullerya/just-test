import { initComponent, ComponentBase } from '/lib/rich-component/dist/rich-component.min.js';

initComponent('just-test-details', class extends ComponentBase {
	connectedCallback() {
	}

	static get htmlUrl() {
		return import.meta.url.replace(/js$/, 'htm');
	}
});