import { initComponent, ComponentBase } from 'rich-component';
import '../jt-test/jt-test.js'

initComponent('jt-suite', class extends ComponentBase {
	static get htmlUrl() {
		return import.meta.url.replace(/js$/, 'htm');
	}
});