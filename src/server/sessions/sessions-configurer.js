import { getEnvironmentsService } from '../environments/environments-service.js';
import { getTestingService } from '../testing/testing-service.js';
import { getCoverageService } from '../coverage/coverage-service.js';

export default sessionConfig => {
	if (!sessionConfig || typeof sessionConfig !== 'object') {
		throw new Error(`session configuration MUST be a non-null object, got '${sessionConfig}'`);
	}
	if (!Array.isArray(sessionConfig.environments) || !sessionConfig.environments.length) {
		throw new Error(`session configuration MUST have at top level 'environments' list with at least 1 entry, got '${sessionConfig.environments}'`);
	}

	const result = { environments: [] };
	for (const e of sessionConfig.environments) {
		const tmp = getEnvironmentsService().verifyEnrichConfig(e);
		tmp.tests = getTestingService().verifyEnrichConfig(e.tests, e);
		tmp.coverage = getCoverageService().verifyEnrichConfig(e.coverage, e);
		result.environments.push(tmp);
	}

	return Object.freeze(result);
};