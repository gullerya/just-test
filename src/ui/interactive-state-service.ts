// @ts-nocheck
/**
 * Manages observable session state (interactive environment only)
 */
import StateService from '/core/runner/state-service.ts';
import { Session } from '/core/testing/model/session.js';
import { ties } from 'data-tier';

const MODEL_KEY = 'justTestModel';

class TiedStateService extends StateService {
	constructor() {
		super(ties.get(MODEL_KEY) ? ties.get(MODEL_KEY) : ties.create(MODEL_KEY, new Session()));
	}

	setSelectedTest(suiteName, testName) {
		this.model.selectedTest = this.getTest(suiteName, testName);
	}
}

export default new TiedStateService();
