import { test } from '@gullerya/just-test';
import { assert } from '@gullerya/just-test/assert';
import {
	verifyEnrichConfig,
	dismiss,
	dismissAll
} from '../../../src/server/environments/environments-service.ts';

//	Only the pure / registry-only slices are covered here. The `launch` path
//	drives playwright / subprocess launchers that belong to e2e coverage
//	(exercised by the matrix configs), not unit tests.

//	-----------------------------------------------------------------
//	verifyEnrichConfig
//	-----------------------------------------------------------------

test('verifyEnrichConfig - rejects null', () => {
	assert.throws(() => verifyEnrichConfig(null));
});

test('verifyEnrichConfig - rejects undefined', () => {
	assert.throws(() => verifyEnrichConfig(undefined));
});

test('verifyEnrichConfig - rejects non-object primitives', () => {
	assert.throws(() => verifyEnrichConfig('env'));
	assert.throws(() => verifyEnrichConfig(42));
});

test('verifyEnrichConfig - delegates to configurer (interactive happy path)', () => {
	const out: any = verifyEnrichConfig({ interactive: true });
	assert.strictEqual(out.interactive, true);
});

test('verifyEnrichConfig - delegates to configurer (browser happy path)', () => {
	const out: any = verifyEnrichConfig({ browser: { type: 'chromium' } });
	assert.strictEqual(out.browser.type, 'chromium');
	//	configurer fills in the default executor
	assert.strictEqual(out.browser.executors.type, 'iframe');
});

test('verifyEnrichConfig - propagates configurer failures', () => {
	assert.throws(() => verifyEnrichConfig({ browser: { type: 'opera' } }));
});

//	-----------------------------------------------------------------
//	dismiss
//	-----------------------------------------------------------------

test('dismiss - rejects empty id', async () => {
	try {
		await dismiss('');
		assert.fail('expected dismiss to throw on empty id');
	} catch (e: any) {
		assert.isTrue(e.message.includes('environment ID MUST be a non-empty string'));
	}
});

test('dismiss - rejects non-string id', async () => {
	try {
		await dismiss(42 as any);
		assert.fail('expected dismiss to throw on numeric id');
	} catch (e: any) {
		assert.isTrue(e.message.includes('environment ID MUST be a non-empty string'));
	}
});

test('dismiss - unknown id is a silent no-op (does not throw)', async () => {
	//	warn-and-return path; reaching here without throw is the assertion
	await dismiss('no-such-env');
});

//	-----------------------------------------------------------------
//	dismissAll - registry is empty in unit context, must complete cleanly
//	-----------------------------------------------------------------

test('dismissAll - completes cleanly when registry is empty', async () => {
	await dismissAll();
});
