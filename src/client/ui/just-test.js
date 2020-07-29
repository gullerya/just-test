import { constants } from './utils.js';
import { STATUSES, RANDOM_CHARSETS } from './test.js';

export {
	getSuite,
	RANDOM_CHARSETS
}

const
	testsMap = {};

window.addEventListener('message', event => {
	if (event.origin !== document.location.origin) {
		throw new Error(`expected message for '${document.location.origin}', received one for '${event.origin}'`);
	}

	if (event.data.type === constants.TEST_RUN_ACTION) {
		testsMap[`${event.data.suiteName}|${event.data.testName}`]();
	}
});

function getSuite(options) {
	const suiteName = options.name;

	return {
		runTest: function (options, testCode) {
			//	cache code
			testsMap[`${suiteName}|${options.name}`] = testCode;

			//	notify main
			window.parent.postMessage({
				type: constants.TEST_ADDED_EVENT,
				suiteName: suiteName,
				testOptions: options
			}, document.location.origin);
		}
	}
}

function stringifyDuration(duration) {
	let ds = '';
	if (duration > 99) ds = (duration / 1000).toFixed(1) + ' s' + String.fromCharCode(160);
	else if (duration > 59900) ds = (duration / 60000).toFixed(1) + ' m' + String.fromCharCode(160);
	else ds = duration.toFixed(1) + ' ms';
	return ds;
}