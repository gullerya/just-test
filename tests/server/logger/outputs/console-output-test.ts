import { test } from '@gullerya/just-test';
import { assert } from '@gullerya/just-test/assert';
import ConsoleOutput from '../../../../src/server/logger/outputs/console-output.ts';

//	Stubs globalThis.console for the duration of a single emission, then
//	restores the original to avoid leaking into sibling tests.

function withStubbedConsole<T>(fn: (captured: {
	debug: any[], info: any[], warn: any[], error: any[]
}) => T): T {
	const original = globalThis.console;
	const captured = { debug: [] as any[], info: [] as any[], warn: [] as any[], error: [] as any[] };
	globalThis.console = {
		...original,
		debug: (...a: any[]) => { captured.debug.push(a); },
		info: (...a: any[]) => { captured.info.push(a); },
		warn: (...a: any[]) => { captured.warn.push(a); },
		error: (...a: any[]) => { captured.error.push(a); }
	} as any;
	try {
		return fn(captured);
	} finally {
		globalThis.console = original;
	}
}

test('console-output - debug delegates to console.debug', () => {
	withStubbedConsole(cap => {
		new ConsoleOutput().debug('msg');
		assert.strictEqual(cap.debug.length, 1);
		assert.strictEqual(cap.debug[0][0], 'msg');
	});
});

test('console-output - info delegates to console.info', () => {
	withStubbedConsole(cap => {
		new ConsoleOutput().info('msg');
		assert.strictEqual(cap.info.length, 1);
		assert.strictEqual(cap.info[0][0], 'msg');
	});
});

test('console-output - warn delegates to console.warn', () => {
	withStubbedConsole(cap => {
		new ConsoleOutput().warn('msg');
		assert.strictEqual(cap.warn.length, 1);
		assert.strictEqual(cap.warn[0][0], 'msg');
	});
});

test('console-output - error delegates to console.error', () => {
	withStubbedConsole(cap => {
		new ConsoleOutput().error('msg');
		assert.strictEqual(cap.error.length, 1);
		assert.strictEqual(cap.error[0][0], 'msg');
	});
});

test('console-output - each call routes to matching method only', () => {
	withStubbedConsole(cap => {
		const out = new ConsoleOutput();
		out.debug('d');
		out.info('i');
		out.warn('w');
		out.error('e');
		assert.strictEqual(cap.debug.length, 1);
		assert.strictEqual(cap.info.length, 1);
		assert.strictEqual(cap.warn.length, 1);
		assert.strictEqual(cap.error.length, 1);
	});
});
