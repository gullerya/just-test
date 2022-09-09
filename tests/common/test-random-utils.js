import { assert } from 'chai';
import { getSuite } from 'just-test/runner';
import { CHAR_SOURCES, getRandom } from 'just-test/random-utils';

const suite = getSuite('Random utils');

suite.test('random all', () => {
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

suite.test('random numeric', () => {
	const it = 100;
	const rl = 10;
	const sm = new Set();
	for (let i = 0; i < it; i++) {
		sm.add(getRandom(rl, CHAR_SOURCES.numeric))
	}

	assert.strictEqual(it, sm.size);
	for (const k of sm) {
		assert.strictEqual(rl, k.length);
		assert.isTrue(/[0-9]+/.test(k));
	}
});

suite.test('random alpha lower', () => {
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

suite.test('random alpha upper', () => {
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

suite.test('random alpha all', () => {
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

suite.test('negative - length null', () => {
	assert.throws(() => getRandom(null), 'MUST be a number');
});

suite.test('negative - length less then 1', () => {
	assert.throws(() => getRandom(0), 'MUST be a number');
});

suite.test('negative - length above the 128', () => {
	assert.throws(() => getRandom(200), 'MUST be a number');
});
