import SimpleStateService from './simple-state-service.js';
import { loadMetadata, execute } from './main.js';
import { reportResults } from './report-service.js';

(async () => {
	let metadata;
	const stateService = new SimpleStateService();
	try {
		metadata = await loadMetadata();
		await execute(metadata, stateService);
		await reportResults(metadata.sessionId, metadata.id, stateService.getAll());
	} catch (e) {
		console.error(e);
		console.error('session execution failed with the previous error');
		await reportResults(metadata.sessionId, metadata.id, stateService.getAll());
	}
})();