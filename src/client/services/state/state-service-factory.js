let stateServiceInitPromise = null;
let stateService = null;

export {
	initStateService,
	stateService
}

async function initStateService(currentEnvironment) {
	if (!stateServiceInitPromise) {
		let importService;
		if (currentEnvironment.browser) {
			importService = import('./data-tied-state-service.js');
		} else {
			importService = import('./simple-state-service.js');
		}
		stateServiceInitPromise = importService.then(m => stateService = new m.default());
	}
	return stateServiceInitPromise;
}