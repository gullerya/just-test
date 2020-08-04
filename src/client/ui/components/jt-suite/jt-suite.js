import { initComponent, ComponentBase } from '/libs/rich-component/dist/rich-component.min.js';
import '../jt-test/jt-test.js'
import { runResults } from '../../utils.js';

initComponent('just-test-suite', class extends ComponentBase {
	connectedCallback() {
	}

	set suiteData(suiteData) {
		console.log(suiteData);
	}

	static get htmlUrl() {
		return import.meta.url.replace(/js$/, 'htm');
	}
});