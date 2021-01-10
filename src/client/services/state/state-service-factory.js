let stateServiceInitPromise = null;
let stateService = null;

export {
	initStateService,
	stateService
}

async function initStateService(interactiveMode = false) {
	if (!stateServiceInitPromise) {
		let importServices = [];
		if (interactiveMode) {
			importServices.push(import('./data-tied-state-service.js'));
		} else {
			importServices.push(import('./simple-state-service.js'));
		}
		stateServiceInitPromise = Promise.all(importServices).then(([m]) => stateService = new m.default());
	}
	return stateServiceInitPromise;
}