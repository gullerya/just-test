import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from '@gullerya/just-test';
import { assert } from '@gullerya/just-test/assert';
import { getRandom } from '../../../../src/common/random-utils.ts';
import FileOutput from '../../../../src/server/logger/outputs/file-output.ts';

//	FileOutput buffers writes and flushes on a 48ms setTimeout. Each test
//	creates its own tempdir so flushes from sibling tests cannot collide,
//	and calls `await out.close()` before asserting on file contents — close
//	blocks until the in-flight flush settles.

function tempLog(): string {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'just-test-fo-'));
	return path.join(dir, 'nested', 'log.txt');
}

function cleanup(p: string) {
	try {
		//	remove the mkdtemp root (two levels up from `nested/log.txt`)
		const root = path.dirname(path.dirname(p));
		fs.rmSync(root, { recursive: true, force: true });
	} catch { /* best effort */ }
}

//	-----------------------------------------------------------------
//	constructor validation
//	-----------------------------------------------------------------

test('file-output - rejects empty base path', () => {
	assert.throws(() => new FileOutput(''));
});

test('file-output - rejects non-string base path', () => {
	assert.throws(() => new FileOutput(null as any));
	assert.throws(() => new FileOutput(42 as any));
});

//	-----------------------------------------------------------------
//	mkdir + cleanStart
//	-----------------------------------------------------------------

test('file-output - creates parent directory if missing', async () => {
	const p = tempLog();
	try {
		const out = new FileOutput(p);
		await out.close();
		assert.isTrue(fs.existsSync(path.dirname(p)));
	} finally {
		cleanup(p);
	}
});

test('file-output - cleanStart truncates existing file', async () => {
	const p = tempLog();
	try {
		fs.mkdirSync(path.dirname(p), { recursive: true });
		fs.writeFileSync(p, 'pre-existing content');
		const out = new FileOutput(p, { cleanStart: true, encoding: 'utf-8' });
		await out.close();
		const contents = fs.readFileSync(p, 'utf-8');
		assert.strictEqual(contents, '');
	} finally {
		cleanup(p);
	}
});

//	-----------------------------------------------------------------
//	buffered emission + flush on close
//	-----------------------------------------------------------------

test('file-output - buffered writes are flushed by close()', async () => {
	const p = tempLog();
	try {
		const out = new FileOutput(p);
		out.info('hello');
		out.info('world');
		await out.close();
		const contents = fs.readFileSync(p, 'utf-8');
		assert.isTrue(contents.includes('hello'));
		assert.isTrue(contents.includes('world'));
	} finally {
		cleanup(p);
	}
});

test('file-output - all four severities route into the same file', async () => {
	const p = tempLog();
	try {
		const out = new FileOutput(p);
		out.debug('d-line');
		out.info('i-line');
		out.warn('w-line');
		out.error('e-line');
		await out.close();
		const contents = fs.readFileSync(p, 'utf-8');
		for (const s of ['d-line', 'i-line', 'w-line', 'e-line']) {
			assert.isTrue(contents.includes(s));
		}
	} finally {
		cleanup(p);
	}
});

//	-----------------------------------------------------------------
//	ANSI color stripping
//	-----------------------------------------------------------------

test('file-output - strips ANSI color escapes on write', async () => {
	const p = tempLog();
	try {
		const out = new FileOutput(p);
		out.info('\u001B[31mred\u001B[0m text');
		await out.close();
		const contents = fs.readFileSync(p, 'utf-8');
		//	color codes are stripped (start at `\u001B[` + digits + `m`);
		//	the matcher leaves the literal "text" between them intact
		assert.isTrue(contents.includes('red text') || contents.includes('redtext'));
		assert.isFalse(contents.includes('\u001B['));
	} finally {
		cleanup(p);
	}
});

//	-----------------------------------------------------------------
//	post-close writes ignored
//	-----------------------------------------------------------------

test('file-output - writes issued after close() are ignored', async () => {
	const p = tempLog();
	try {
		const out = new FileOutput(p);
		out.info('before-close');
		await out.close();
		out.info('after-close');
		//	no background writer is running; contents MUST remain what
		//	close() already flushed
		const contents = fs.readFileSync(p, 'utf-8');
		assert.isTrue(contents.includes('before-close'));
		assert.isFalse(contents.includes('after-close'));
	} finally {
		cleanup(p);
	}
});
