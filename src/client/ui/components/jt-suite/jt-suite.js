import { initComponent, ComponentBase } from '/libs/rich-component/dist/rich-component.min.js';
import '../jt-test/jt-test.js'

initComponent('just-test-suite', class extends ComponentBase {
	connectedCallback() {
	}

	static get htmlUrl() {
		return import.meta.url.replace(/js$/, 'htm');
	}
});