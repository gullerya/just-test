/**
 * Manages observable session state (browser environment only)
 */

import SimpleStateService from './simple-state-service.js';
import { ties } from '/libs/data-tier/dist/data-tier.min.js';

const MODEL_KEY = 'justTestModel';

export default class DataTiedStateService extends SimpleStateService {
	constructor() {
		super(ties.get(MODEL_KEY) ? ties.get(MODEL_KEY) : ties.create(MODEL_KEY, {
			total: 0,
			done: 0,
			duration: null,
			skip: 0,
			pass: 0,
			fail: 0,
			error: 0,
			suites: [],
			selectedTest: { lastRun: { error: {} } }
		}));
	}
}