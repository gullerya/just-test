import { initComponent, ComponentBase } from '/libs/rich-component/dist/rich-component.min.js';

initComponent('jt-details', class extends ComponentBase {
	connectedCallback() {
	}

	static get htmlUrl() {
		return import.meta.url.replace(/js$/, 'htm');
	}
});