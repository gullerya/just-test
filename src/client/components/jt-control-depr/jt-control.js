import { initComponent, ComponentBase } from '/libs/rich-component/dist/rich-component.min.js';
import '/libs/data-tier-list/dist/data-tier-list.min.js';
import '../jt-suite/jt-suite.js';
import { STATUS } from '../../common/constants.js';

const RESULTS_KEY = Symbol('results.key');

initComponent('jt-control', class extends ComponentBase {
	set results(results) {
		this[RESULTS_KEY] = results;
	}

	get results() {
		return this[RESULTS_KEY];
	}


	static get htmlUrl() {
		return import.meta.url.replace(/js$/, 'htm');
	}
});