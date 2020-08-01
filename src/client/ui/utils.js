export const constants = Object.freeze({
	TEST_ADDED_EVENT: 'testAdded', TEST_ENDED_EVENT: 'testEnded', RUN_TEST_ACTION: 'test'
});

export const runResults = Object.freeze({
	SKIPPED: 'skipped', PASSED: 'passed', FAILED: 'failed', ERROR: 'error'
});

export function getId(suiteName, testName) {
	return `${suiteName}|${testName}`;
}

export function stringifyDuration(duration) {
	let result = '';
	if (duration > 99) result = (duration / 1000).toFixed(1) + ' s' + String.fromCharCode(160);
	else if (duration > 59900) result = (duration / 60000).toFixed(1) + ' m' + String.fromCharCode(160);
	else result = duration.toFixed(1) + ' ms';
	return result;
}