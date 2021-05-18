import Logger from '../logger/logger.js';
import { getRandom } from '../../common/random-utils.js';
import { verifyEnrichConfig } from '../environments/environments-service.js';
import { getTestingService } from '../testing/testing-service.js';
import { getCoverageService } from '../coverage/coverage-service.js';

const
	logger = new Logger({ context: 'session configurer' });

export default sessionConfig => {
	if (!sessionConfig || typeof sessionConfig !== 'object') {
		throw new Error(`session configuration MUST be a non-null object, got '${sessionConfig}'`);
	}
	if (!Array.isArray(sessionConfig.environments) || !sessionConfig.environments.length) {
		throw new Error(`session configuration MUST have at top level 'environments' list with at least 1 entry, got '${sessionConfig.environments}'`);
	}

	const result = { environments: {} };
	for (const e of sessionConfig.environments) {
		const tmp = verifyEnrichConfig(e);
		tmp.id = getRandom(8);
		tmp.tests = getTestingService().verifyEnrichConfig(e.tests, e);
		tmp.coverage = getCoverageService().verifyEnrichConfig(e.coverage, e);
		while (tmp.id in result.environments) {
			logger.error(`session ID collision (${tmp.id})`);
			tmp.id = getRandom(8);
		}
		result.environments[tmp.id] = tmp;
	}

	return Object.freeze(result);
};