import { test } from '@gullerya/just-test';
import { assert } from '@gullerya/just-test/assert';
import { RequestHandlerBase } from '../../../src/server/handlers/request-handler-base.ts';

//	basePath validation — the base constructor reads `this.basePath`
//	(subclass getter) and asserts it matches /^[a-z-_]+$/. Use a
//	subclass per case with a literal getter; parameterizing via a
//	#private field would trip the super()/#field-init ordering gotcha
//	(super() runs before #field is assigned).

class BasePathValid extends RequestHandlerBase {
	override get basePath(): string { return 'api'; }
}

class BasePathWithDash extends RequestHandlerBase {
	override get basePath(): string { return 'my-handler'; }
}

class BasePathWithUnderscore extends RequestHandlerBase {
	override get basePath(): string { return 'my_handler'; }
}

class BasePathEmpty extends RequestHandlerBase {
	override get basePath(): string { return ''; }
}

class BasePathWithDigit extends RequestHandlerBase {
	override get basePath(): string { return 'api1'; }
}

class BasePathUppercase extends RequestHandlerBase {
	override get basePath(): string { return 'API'; }
}

class BasePathWithSlash extends RequestHandlerBase {
	override get basePath(): string { return 'a/b'; }
}

class BasePathNonString extends RequestHandlerBase {
	override get basePath(): any { return 123; }
}

test('RequestHandlerBase - lowercase-only basePath is accepted', () => {
	const h = new BasePathValid();
	assert.strictEqual(h.basePath, 'api');
});

test('RequestHandlerBase - basePath with dash is accepted', () => {
	const h = new BasePathWithDash();
	assert.strictEqual(h.basePath, 'my-handler');
});

test('RequestHandlerBase - basePath with underscore is accepted', () => {
	const h = new BasePathWithUnderscore();
	assert.strictEqual(h.basePath, 'my_handler');
});

test('RequestHandlerBase - empty basePath rejected', () => {
	assert.throws(() => new BasePathEmpty(), 'extending handler MUST provide basePath');
});

test('RequestHandlerBase - basePath with digit rejected', () => {
	assert.throws(() => new BasePathWithDigit(), 'extending handler MUST provide basePath');
});

test('RequestHandlerBase - uppercase basePath rejected', () => {
	assert.throws(() => new BasePathUppercase(), 'extending handler MUST provide basePath');
});

test('RequestHandlerBase - basePath with slash rejected', () => {
	assert.throws(() => new BasePathWithSlash(), 'extending handler MUST provide basePath');
});

test('RequestHandlerBase - non-string basePath rejected', () => {
	assert.throws(() => new BasePathNonString(), 'extending handler MUST provide basePath');
});

//	default handle() throws — subclass must override

test('RequestHandlerBase - default handle() throws', async () => {
	const h = new BasePathValid();
	let caught: any = null;
	try {
		await h.handle('', {} as any, {} as any);
	} catch (e) {
		caught = e;
	}
	assert.isTrue(caught instanceof Error);
	assert.strictEqual(caught.message, 'implementation missing');
});

//	compileTsToJs — TS→JS transpile + per-reqUrl cache

class CompilerSubject extends RequestHandlerBase {
	override get basePath(): string { return 'core'; }
}

test('compileTsToJs - transpiles simple TS to JS', () => {
	const h = new CompilerSubject();
	const out = h.compileTsToJs('http://h/foo.ts', 'const x: number = 1; export default x;');
	assert.isTrue(out.includes('const x = 1'));
	assert.isFalse(out.includes(': number'));
});

test('compileTsToJs - caches by reqUrl (second call does not re-transpile)', () => {
	const h = new CompilerSubject();
	const first = h.compileTsToJs('http://h/same.ts', 'const x: number = 1;');
	//	Second call with different source but same URL — should return
	//	the cached output of the first call, proving we hit the cache.
	const second = h.compileTsToJs('http://h/same.ts', 'const y: string = "different";');
	assert.strictEqual(first, second);
});

test('compileTsToJs - cache is per-instance, not shared across instances', () => {
	const a = new CompilerSubject();
	const b = new CompilerSubject();
	const fromA = a.compileTsToJs('http://h/shared.ts', 'const x: number = 1;');
	const fromB = b.compileTsToJs('http://h/shared.ts', 'const y: string = "different";');
	//	Different instances → separate caches → different outputs
	assert.isFalse(fromA === fromB);
	assert.isTrue(fromB.includes('y = "different"'));
});

test('compileTsToJs - different reqUrls are cached independently', () => {
	const h = new CompilerSubject();
	const a = h.compileTsToJs('http://h/a.ts', 'const x: number = 1;');
	const b = h.compileTsToJs('http://h/b.ts', 'const y: string = "two";');
	assert.isFalse(a === b);
	assert.isTrue(a.includes('x = 1'));
	assert.isTrue(b.includes('y = "two"'));
});

//	enrichImportMap — no-op when sesId/envId absent; replaces
//	placeholder when present and session has importmap

class ImportMapSubject extends RequestHandlerBase {
	override get basePath(): string { return 'static'; }
}

test('enrichImportMap - returns input unchanged when sesId/envId absent', async () => {
	const h = new ImportMapSubject();
	const html = '<html><!--IMPORT_MAP_PLACEHOLDER--></html>';
	const out = await h.enrichImportMap('/static/page.html', html);
	assert.strictEqual(out, html);
});

test('enrichImportMap - returns input unchanged when only sesId present', async () => {
	const h = new ImportMapSubject();
	const html = '<html><!--IMPORT_MAP_PLACEHOLDER--></html>';
	const out = await h.enrichImportMap('/static/page.html?ses-id=abc', html);
	assert.strictEqual(out, html);
});
