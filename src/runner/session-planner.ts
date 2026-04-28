/**
 * Shared planning phase for both browser and nodejs session-boxes.
 * Imports each test resource under PLAN execution context so the
 * consumer-side `test(...)` calls register their metadata, then feeds
 * each planned test into the state service.
 *
 * The only environment-specific piece is how a test-source string is
 * resolved to an importable URL — injected by the caller.
 */

import SimpleStateService from './simple-state-service.ts';
import { PlanningExecutionContext, EXECUTION_MODES, setExecutionContext } from './environment-config.js';
import { TestError } from '../testing/model/test-error.ts';

export async function planSession(
	testsResources: string[],
	stateService: SimpleStateService,
	resolveSource: (source: string) => string
): Promise<void> {
	const started = globalThis.performance.now();

	console.info(`fetching ${testsResources.length} test resource/s...`);
	for (const testSource of testsResources) {
		try {
			const execContext = setExecutionContext(EXECUTION_MODES.PLAN) as PlanningExecutionContext;
			execContext.suiteName = testSource;
			await import(resolveSource(testSource));
			for (const { name, config } of execContext.testConfigs) {
				stateService.addTest({
					name,
					config,
					source: testSource,
					suiteName: execContext.suiteName,
					runs: []
				});
			}
		} catch (e) {
			console.error(`failed to process '${testSource}':`);
			console.error(e);
			stateService.reportError(TestError.fromError(e as Error));
		}
	}

	const ended = globalThis.performance.now();
	console.info(`... ${testsResources.length} test resource/s fetched (planning phase) in ${(ended - started).toFixed(1)}ms`);
}
