//	Fixture for session-planner-test — registers the same test name twice
//	followed by a distinct test, to verify duplicate-name handling does
//	NOT abort subsequent registrations in the same source.
import { test } from '@gullerya/just-test';

test('same', () => { });
test('same', () => { });
test('other', () => { });
