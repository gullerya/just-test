export {
	getTestId,
	parseTestId,
	getValidName
}

const TEST_ID_SEPARATOR = '-|-';

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

	const result = input.trim();
	if (!result) {
		throw new Error(`name MUST NOT be empty`);
	}

	return result;
}