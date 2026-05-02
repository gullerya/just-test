import Logger from '../logger/logger.ts';
import { getRandom } from '../../common/random-utils.ts';
import { verifyEnrichConfig } from '../environments/environments-service.ts';
import { verifyEnrichConfig as verifyEnrichTestsConfig } from '../../testing/testing-service.ts';
import { verifyEnrichConfig as verifyEnrichCoverageConfig } from '../../coverage/coverage-service.ts';

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
		tmp.tests = verifyEnrichTestsConfig(e.tests, e);
		tmp.coverage = verifyEnrichCoverageConfig(e.coverage, e);
		while (tmp.id in result.environments) {
			logger.error(`session ID collision (${tmp.id})`);
			tmp.id = getRandom(8);
		}
		result.environments[tmp.id] = tmp;
	}


	return Object.freeze(result);
};