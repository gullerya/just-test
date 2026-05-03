import { test } from '@gullerya/just-test';
import { assert } from '@gullerya/just-test/assert';
import { getRandom } from '../../src/common/random-utils.ts';
import Logger, { LOG_LEVELS } from '../../src/logging/logger.ts';

//	CONTEXTS_REGISTRAR is a module-level registry; each Logger instance MUST
//	have a unique context name across the entire test run. Use a fresh
//	random suffix per test to keep them isolated.
function uniqueContext(prefix: string): string {
	return `${prefix}-${getRandom(8)}`;
}

class FakeOutput {
	debugArgs: any[] = [];
	infoArgs: any[] = [];
	warnArgs: any[] = [];
	errorArgs: any[] = [];
	debug(a: any) { this.debugArgs.push(a); }
	info(a: any) { this.infoArgs.push(a); }
	warn(a: any) { this.warnArgs.push(a); }
	error(a: any) { this.errorArgs.push(a); }
}

//	-----------------------------------------------------------------
//	configuration validation
//	-----------------------------------------------------------------

test('logger - rejects null configuration', () => {
	assert.throws(() => new Logger(null));
});

test('logger - rejects non-object configuration', () => {
	assert.throws(() => new Logger('ctx' as any));
	assert.throws(() => new Logger(42 as any));
});

test('logger - rejects duplicate context', () => {
	const ctx = uniqueContext('dup');
	new Logger({ context: ctx, outputs: [new FakeOutput()] });
	assert.throws(() => new Logger({ context: ctx, outputs: [new FakeOutput()] }));
});

test('logger - rejects non-array outputs', () => {
	assert.throws(() => new Logger({ context: uniqueContext('bad-out'), outputs: 'x' as any }));
	assert.throws(() => new Logger({ context: uniqueContext('bad-out'), outputs: {} as any }));
});

//	-----------------------------------------------------------------
//	level setter
//	-----------------------------------------------------------------

test('logger - level defaults to INFO', () => {
	const l = new Logger({ context: uniqueContext('def-lvl'), outputs: [new FakeOutput()] });
	assert.strictEqual(l.level, LOG_LEVELS.INFO);
});

test('logger - level setter accepts all documented levels', () => {
	const l = new Logger({ context: uniqueContext('lvl-ok'), outputs: [new FakeOutput()] });
	for (const v of Object.values(LOG_LEVELS)) {
		l.level = v;
		assert.strictEqual(l.level, v);
	}
});

test('logger - level setter rejects unknown numeric values', () => {
	const l = new Logger({ context: uniqueContext('lvl-bad'), outputs: [new FakeOutput()] });
	assert.throws(() => { l.level = 99 as any; });
});

test('logger - level setter rejects non-number values', () => {
	const l = new Logger({ context: uniqueContext('lvl-type'), outputs: [new FakeOutput()] });
	assert.throws(() => { l.level = 'info' as any; });
	assert.throws(() => { l.level = null as any; });
});

//	-----------------------------------------------------------------
//	level gating
//	-----------------------------------------------------------------

test('logger - at ERROR level only error() emits', () => {
	const out = new FakeOutput();
	const l = new Logger({ context: uniqueContext('gate-err'), outputs: [out] });
	l.level = LOG_LEVELS.ERROR;
	l.debug('d'); l.info('i'); l.warn('w'); l.error('e');
	assert.strictEqual(out.debugArgs.length, 0);
	assert.strictEqual(out.infoArgs.length, 0);
	assert.strictEqual(out.warnArgs.length, 0);
	assert.strictEqual(out.errorArgs.length, 1);
});

test('logger - at WARN level error+warn emit', () => {
	const out = new FakeOutput();
	const l = new Logger({ context: uniqueContext('gate-warn'), outputs: [out] });
	l.level = LOG_LEVELS.WARN;
	l.debug('d'); l.info('i'); l.warn('w'); l.error('e');
	assert.strictEqual(out.debugArgs.length, 0);
	assert.strictEqual(out.infoArgs.length, 0);
	assert.strictEqual(out.warnArgs.length, 1);
	assert.strictEqual(out.errorArgs.length, 1);
});

test('logger - at INFO level debug is silent', () => {
	const out = new FakeOutput();
	const l = new Logger({ context: uniqueContext('gate-info'), outputs: [out] });
	l.level = LOG_LEVELS.INFO;
	l.debug('d'); l.info('i'); l.warn('w'); l.error('e');
	assert.strictEqual(out.debugArgs.length, 0);
	assert.strictEqual(out.infoArgs.length, 1);
	assert.strictEqual(out.warnArgs.length, 1);
	assert.strictEqual(out.errorArgs.length, 1);
});

test('logger - at DEBUG level all emit', () => {
	const out = new FakeOutput();
	const l = new Logger({ context: uniqueContext('gate-dbg'), outputs: [out] });
	l.level = LOG_LEVELS.DEBUG;
	l.debug('d'); l.info('i'); l.warn('w'); l.error('e');
	assert.strictEqual(out.debugArgs.length, 1);
	assert.strictEqual(out.infoArgs.length, 1);
	assert.strictEqual(out.warnArgs.length, 1);
	assert.strictEqual(out.errorArgs.length, 1);
});

//	-----------------------------------------------------------------
//	aliases
//	-----------------------------------------------------------------

test('logger - dir/log alias info', () => {
	const l = new Logger({ context: uniqueContext('alias-info'), outputs: [new FakeOutput()] });
	assert.strictEqual(l.dir, l.info);
	assert.strictEqual(l.log, l.info);
});

test('logger - warning aliases warn', () => {
	const l = new Logger({ context: uniqueContext('alias-warn'), outputs: [new FakeOutput()] });
	assert.strictEqual(l.warning, l.warn);
});

//	-----------------------------------------------------------------
//	formatting
//	-----------------------------------------------------------------

test('logger - string args are formatted inline with ISO date, level tag, context', () => {
	const out = new FakeOutput();
	const ctx = uniqueContext('fmt');
	const l = new Logger({ context: ctx, outputs: [out] });
	l.info('hello world');
	assert.strictEqual(out.infoArgs.length, 1);
	const line = out.infoArgs[0];
	//	ISO date prefix: 20xx-xx-xxTxx:xx:xx...
	assert.isTrue(/^\d{4}-\d{2}-\d{2}T/.test(line));
	assert.isTrue(line.includes(' INF '));
	assert.isTrue(line.includes(`[${ctx}]`));
	assert.isTrue(line.endsWith('- hello world'));
});

test('logger - object args emit a header line AND a serialized JSON line', () => {
	const out = new FakeOutput();
	const ctx = uniqueContext('fmt-obj');
	const l = new Logger({ context: ctx, outputs: [out] });
	l.info({ a: 1, b: 'two' });
	//	object args => 2 entries pushed to the output (header + serialization)
	assert.strictEqual(out.infoArgs.length, 2);
	assert.isTrue(out.infoArgs[0].includes(`[${ctx}]`));
	assert.isTrue(out.infoArgs[0].endsWith('-'));
	assert.isTrue(out.infoArgs[1].includes('"a": 1'));
	assert.isTrue(out.infoArgs[1].includes('"b": "two"'));
});

test('logger - Error args emit name/message header and stack line', () => {
	const out = new FakeOutput();
	const ctx = uniqueContext('fmt-err');
	const l = new Logger({ context: ctx, outputs: [out] });
	const e = new TypeError('something broke');
	l.error(e);
	assert.strictEqual(out.errorArgs.length, 2);
	assert.isTrue(out.errorArgs[0].includes(`[${ctx}]`));
	assert.isTrue(out.errorArgs[0].endsWith('TypeError: something broke'));
	assert.isTrue(typeof out.errorArgs[1] === 'string');
	assert.isTrue(out.errorArgs[1].includes('TypeError: something broke'));
});

test('logger - object with circular reference serializes without throwing', () => {
	const out = new FakeOutput();
	const l = new Logger({ context: uniqueContext('fmt-circ'), outputs: [out] });
	const o: any = { a: 1 };
	o.self = o;
	l.info(o);
	assert.strictEqual(out.infoArgs.length, 2);
	assert.isTrue(out.infoArgs[1].includes('[Circular]'));
});

test('logger - level tags map to DBG/INF/WRN/ERR', () => {
	const out = new FakeOutput();
	const l = new Logger({ context: uniqueContext('tags'), outputs: [out] });
	l.level = LOG_LEVELS.DEBUG;
	l.debug('d');
	l.info('i');
	l.warn('w');
	l.error('e');
	assert.isTrue(out.debugArgs[0].includes(' DBG '));
	assert.isTrue(out.infoArgs[0].includes(' INF '));
	assert.isTrue(out.warnArgs[0].includes(' WRN '));
	assert.isTrue(out.errorArgs[0].includes(' ERR '));
});

//	-----------------------------------------------------------------
//	multi-output fan-out
//	-----------------------------------------------------------------

test('logger - emits to every configured output', () => {
	const a = new FakeOutput();
	const b = new FakeOutput();
	const l = new Logger({ context: uniqueContext('fan'), outputs: [a, b] });
	l.info('msg');
	assert.strictEqual(a.infoArgs.length, 1);
	assert.strictEqual(b.infoArgs.length, 1);
});

//	-----------------------------------------------------------------
//	variadic args
//	-----------------------------------------------------------------

test('logger - variadic strings emit one line per arg', () => {
	const out = new FakeOutput();
	const l = new Logger({ context: uniqueContext('variadic'), outputs: [out] });
	l.info('a', 'b', 'c');
	assert.strictEqual(out.infoArgs.length, 3);
	assert.isTrue(out.infoArgs[0].endsWith('- a'));
	assert.isTrue(out.infoArgs[1].endsWith('- b'));
	assert.isTrue(out.infoArgs[2].endsWith('- c'));
});
