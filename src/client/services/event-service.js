/**
 * This module initializes and exposes a single event bus
 * - even bus is assumed to implement EventTarget
 */

class EventService {
	constructor() {
		if (globalThis.document) {
			this._eventTarget = globalThis.document.createElement('div');
		} else {
			throw new Error('non-browser environment is not yet supported');
		}
		console.info('event service initialized successfully');
	}

	addEventListener() {
		this._eventTarget.addEventListener(...arguments);
	}

	removeEventListener() {
		this._eventTarget.removeEventListener(...arguments);
	}

	dispatchEvent() {
		this._eventTarget.dispatchEvent(...arguments);
	}
}

export default new EventService();