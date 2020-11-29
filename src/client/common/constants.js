export {
	EVENTS,
	STATUS
}

const EVENTS = Object.freeze({
	RUN_STARTED: 'runStarted',
	RUN_ENDED: 'runEnded'
});

const STATUS = Object.freeze({
	SKIP: 'skip',
	WAIT: 'wait',
	RUNS: 'runs',
	PASS: 'pass',
	FAIL: 'fail'
});