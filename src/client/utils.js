export const EVENTS = Object.freeze({
	RUN_STARTED: 'runStarted',
	RUN_ENDED: 'runEnded'
});

export const STATUS = Object.freeze({
	PENDING: 'pending',
	RUNNING: 'running',
	FINISHED: 'finished'
});

export const RESULT = Object.freeze({
	ERROR: 'error',
	FAIL: 'fail',
	PASS: 'pass',
	SKIP: 'skip'
});

export function stringifyDuration(duration) {
	let result = '';
	if (duration > 99) result = (duration / 1000).toFixed(1) + ' s' + String.fromCharCode(160);
	else if (duration > 59900) result = (duration / 60000).toFixed(1) + ' m' + String.fromCharCode(160);
	else result = duration.toFixed(1) + ' ms';
	return result;
}
