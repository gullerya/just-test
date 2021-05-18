/**
 * Manages observable session state (interactive environment only)
 */
import SimpleStateService from '/core/client/simple-state-service.js';
import { ties } from 'data-tier';

const MODEL_KEY = 'justTestModel';

class TiedStateService extends SimpleStateService {
	constructor() {
		super(ties.get(MODEL_KEY) ? ties.get(MODEL_KEY) : ties.create(MODEL_KEY, {
			total: 0,
			done: 0,
			timestamp: null,
			time: null,
			skip: 0,
			pass: 0,
			fail: 0,
			suites: []
		}));
	}

	setSelectedTest(suiteName, testName) {
		this.model.selectedTest = this.getTest(suiteName, testName);
	}
}

export default new TiedStateService();
