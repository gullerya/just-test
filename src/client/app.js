import SimpleStateService from './simple-state-service.js';
import { loadMetadata, execute } from './main.js';
import { reportResults } from './report-service.js';

(async () => {
	const metadata = await loadMetadata();
	const stateService = new SimpleStateService();
	try {
		await execute(metadata, stateService);
		await reportResults(metadata.sessionId, metadata.id, stateService.getAll());
	} catch (e) {
		//	TODO: report an env failure here
		console.log(e);
		await reportResults(metadata.sessionId, metadata.id, stateService.getAll());
	}
})();