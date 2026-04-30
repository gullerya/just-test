import { test } from '@gullerya/just-test';
import { assert } from '@gullerya/just-test/assert';
import { EnvironmentBase } from '../../../src/server/environments/environment-base.ts';

test('environment-base - rejects empty session id', () => {
	assert.throws(() => new EnvironmentBase(''));
	assert.throws(() => new EnvironmentBase(null));
	assert.throws(() => new EnvironmentBase(undefined));
	assert.throws(() => new EnvironmentBase(42 as any));
});

test('environment-base - exposes sessionId via getter', () => {
	const eb = new EnvironmentBase('sess-abc');
	assert.strictEqual(eb.sessionId, 'sess-abc');
});

test('environment-base - sessionId is read-only (no public setter)', () => {
	const eb: any = new EnvironmentBase('sess-abc');
	//	attempt to overwrite the accessor value; property is a getter only
	assert.throws(() => { eb.sessionId = 'other'; });
	assert.strictEqual(eb.sessionId, 'sess-abc');
});

test('environment-base - is an EventTarget', () => {
	const eb = new EnvironmentBase('sess-abc');
	assert.isTrue(eb instanceof EventTarget);
});

test('environment-base - launch() throws not-implemented by default', async () => {
	const eb = new EnvironmentBase('sess-abc');
	try {
		await eb.launch();
		assert.fail('expected launch() to throw');
	} catch (e: any) {
		assert.strictEqual(e.message, 'not implemented');
	}
});

test('environment-base - dismiss() throws not-implemented by default', async () => {
	const eb = new EnvironmentBase('sess-abc');
	try {
		await eb.dismiss();
		assert.fail('expected dismiss() to throw');
	} catch (e: any) {
		assert.strictEqual(e.message, 'not implemented');
	}
});
