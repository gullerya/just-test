export {
	getTestId,
	parseTestId,
	getValidName
}

const TEST_ID_SEPARATOR = '\u26ab';

function getTestId(...names) {
	return names.join(TEST_ID_SEPARATOR);
}

function parseTestId(testId) {
	return testId.split(TEST_ID_SEPARATOR);
}

function getValidName(input) {
	if (typeof input !== 'string') {
		throw new Error(`name MUST be a string, got '${input}'`);
	}
	if (input.includes(TEST_ID_SEPARATOR)) {
		throw new Error(`name MUST NOT include '${TEST_ID_SEPARATOR}'`);
	}

	const result = input.trim();
	if (!result) {
		throw new Error(`name MUST NOT be empty`);
	}

	return result;
}