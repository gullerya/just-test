import { initComponent, ComponentBase } from '/libs/rich-component/dist/rich-component.min.js';

initComponent('just-test-view', class extends ComponentBase {
	connectedCallback() {
	}

	static get htmlUrl() {
		return import.meta.url.replace(/js$/, 'htm');
	}
});