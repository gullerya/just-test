let stateServicePromise = null;

export async function getStateService(currentEnvironment) {
	if (!stateServicePromise) {
		if (currentEnvironment.browser) {
			stateServicePromise = import('./data-tied-state-service.js');
		} else {
			stateServicePromise = import('./simple-state-service.js');
		}
	}

	return new (await stateServicePromise).default();
}