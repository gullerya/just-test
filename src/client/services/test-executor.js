/**
 * Single test execution logic and related services
 */
import { EVENTS } from '../utils.js';

const
	testEventsBus = getTestEventsBus(),
	RANDOM_CHARSETS = Object.freeze({ numeric: '0123456789', alphaLower: 'abcdefghijklmnopqrstuvwxyz', alphaUpper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' });

let testListenerInstalled = false;

export {
	RANDOM_CHARSETS
}

/**
 * Ensures environment aware test listener is set
 * 
 * @param {object} metadata - metadata for environment awareness
 */
export async function ensureTestListener(metadata) {
	if (testListenerInstalled) {
		return;
	} else {
		testListenerInstalled = true;
	}
	testEventsBus.addEventListener(EVENTS.RUN_STARTED, e => {
		console.log(`started ${JSON.stringify(e.detail)}`);
	});
	testEventsBus.addEventListener(EVENTS.RUN_ENDED, e => {
		console.log(`ended ${JSON.stringify(e.detail)}`);
	});
}

function getTestEventsBus() {
	if (globalThis.window) {
		let tmp = globalThis.window;
		while (tmp.parent && tmp.parent !== tmp) tmp = tmp.parent;
		return tmp;
	} else {
		throw new Error('NodeJS is not yet supported');
	}
}