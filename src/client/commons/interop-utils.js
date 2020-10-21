export {
	EVENTS,
	RESULT,
	getTestId,
	getValidName
}

const EVENTS = Object.freeze({
	RUN_STARTED: 'runStarted',
	RUN_ENDED: 'runEnded'
});

const RESULT = Object.freeze({
	ERROR: 'error',
	FAIL: 'fail',
	PASS: 'pass',
	SKIP: 'skip'
});

function getTestId(...names) {
	return names.join('|');
}

function getValidName(input) {
	if (typeof input !== 'string') {
		throw new Error(`name MUST be a string, got '${input}'`);
	}

	const result = input.trim();
	if (!result) {
		throw new Error(`name MUST NOT be empty`);
	}

	return result;
}