//	Fixture for session-planner-test. Registers two tests under the
//	PLAN execution context. NOT picked up as a test file itself — the
//	CI configs exclude `tests/runner/_planner-fixtures/**`.
import { test } from '@gullerya/just-test';

test('fixture-test-1', () => { });
test('fixture-test-2', () => { }, { only: true });
