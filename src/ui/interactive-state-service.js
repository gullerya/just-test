/**
 * Manages observable session state (interactive environment only)
 */
import SimpleStateService from '/core/client/simple-state-service.js';
import { Session } from '/core/common/models/tests/session.js';
import { ties } from 'data-tier';

const MODEL_KEY = 'justTestModel';

class TiedStateService extends SimpleStateService {
	constructor() {
		super(ties.get(MODEL_KEY) ? ties.get(MODEL_KEY) : ties.create(MODEL_KEY, new Session()));
	}

	setSelectedTest(suiteName, testName) {
		this.model.selectedTest = this.getTest(suiteName, testName);
	}
}

export default new TiedStateService();
