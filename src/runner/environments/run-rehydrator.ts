//	Test runs cross a process/worker boundary via postMessage, which
//	drops class identity and private fields. Both session-boxes (Node
//	worker and browser iframe/worker/page) need the same plain-object →
//	`TestRun` repackaging, so it lives here — shared by the two hosts,
//	nothing environment-specific inside.
//
//	TestError.fromError requires an Error instance; we rebuild one from
//	the plain payload (the test-box's `toJSON`). `fromError` derives
//	`type` from `error.constructor.name`, but we want the ORIGINAL type
//	(AssertionError / TypeError / …) carried across the boundary — so
//	we construct a TestError directly with `plain.type` when present.

import { TestError } from '../../testing/model/test-error.ts';
import { TestRun } from '../../testing/model/test-run.ts';

export function rehydrateRun(plain: any): TestRun {
	const run = new TestRun();
	run.status = plain.status;
	run.time = plain.time ?? 0;
	run.timestamp = plain.timestamp ?? 0;
	run.coverage = plain.coverage ?? null;
	if (plain.error) {
		run.error = rehydrateError(plain.error);
	}
	return run;
}

export function rehydrateError(plain: any): TestError {
	const e: any = new Error(plain.message ?? '');
	e.name = plain.name ?? 'Error';
	e.stack = plain.stack ?? '';
	const te = TestError.fromError(e);
	//	TestError#cause is `TestError | null`, but the class doesn't
	//	extend Error — so TestError.fromError's `cause instanceof Error`
	//	check would always drop a TestError cause. Rebuild the chain
	//	directly instead of round-tripping through fromError.
	const cause = plain.cause ? rehydrateError(plain.cause) : null;
	return new (TestError as any)(te.name, plain.type ?? te.type, te.message, te.stack, cause);
}
