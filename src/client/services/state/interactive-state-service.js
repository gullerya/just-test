/**
 * Manages observable session state (interactive environment only)
 */

import SimpleStateService from './simple-state-service.js';
import { ties } from 'data-tier';

const MODEL_KEY = 'justTestModel';

export default class DataTiedStateService extends SimpleStateService {
	constructor() {
		super(ties.get(MODEL_KEY) ? ties.get(MODEL_KEY) : ties.create(MODEL_KEY, {
			total: 0,
			done: 0,
			timestampt: null,
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