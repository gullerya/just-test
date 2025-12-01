import { test } from '../../src/runner/just-test.js';
import { assert } from '../../src/common/assert-utils.ts';
import { CHAR_SOURCES, getRandom } from '../../src/common/random-utils.js';

test('random all', () => {
	const it = 100;
	const rl = 8;
	const sm = new Set();
	for (let i = 0; i < it; i++) {
		sm.add(getRandom(rl));
	}

	assert.strictEqual(it, sm.size);
	for (const k of sm) {
		assert.strictEqual(rl, k.length);
	}
});

test('random numeric', () => {
	const it = 100;
	const rl = 10;
	const sm = new Set();
	for (let i = 0; i < it; i++) {
		sm.add(getRandom(rl, CHAR_SOURCES.numeric));
	}

	assert.strictEqual(it, sm.size);
	for (const k of sm) {
		assert.strictEqual(rl, k.length);
		assert.isTrue(/[0-9]+/.test(k));
	}
});

test('random alpha lower', () => {
	const it = 100;
	const rl = 12;
	const sm = new Set();
	for (let i = 0; i < it; i++) {
		sm.add(getRandom(rl, CHAR_SOURCES.alphaLower));
	}

	assert.strictEqual(it, sm.size);
	for (const k of sm) {
		assert.strictEqual(rl, k.length);
		assert.isTrue(/[a-z]+/.test(k));
	}
});

test('random alpha upper', () => {
	const it = 100;
	const rl = 14;
	const sm = new Set();
	for (let i = 0; i < it; i++) {
		sm.add(getRandom(rl, CHAR_SOURCES.alphaUpper));
	}

	assert.strictEqual(it, sm.size);
	for (const k of sm) {
		assert.strictEqual(rl, k.length);
		assert.isTrue(/[A-Z]+/.test(k));
	}
});

test('random alpha all', () => {
	const it = 100;
	const rl = 16;
	const sm = new Set();
	for (let i = 0; i < it; i++) {
		sm.add(getRandom(rl, CHAR_SOURCES.alphaLower + CHAR_SOURCES.alphaUpper));
	}

	assert.strictEqual(it, sm.size);
	for (const k of sm) {
		assert.strictEqual(rl, k.length);
		assert.isTrue(/[a-zA-Z]+/.test(k));
	}
});

test('negative - length null', () => {
	assert.throws(() => getRandom(null), 'MUST be a number');
});

test('negative - length less then 1', () => {
	assert.throws(() => getRandom(0), 'MUST be a number');
});

test('negative - length above the 128', () => {
	assert.throws(() => getRandom(200), 'MUST be a number');
});
