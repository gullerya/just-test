﻿import {
	CHAR_SOURCES,
	getRandom
} from '/aut/bin/client/common/random-utils.js';

const suite = globalThis.getSuite('Random utils');

suite.test('random all', test => {
	const it = 100;
	const rl = 8;
	const sm = new Set();
	for (let i = 0; i < it; i++) {
		sm.add(getRandom(rl));
	}

	test.assert.equal(it, sm.size);
	for (const k of sm) {
		test.assert.equal(rl, k.length);
	}
});

suite.test('random numeric', test => {
	const it = 100;
	const rl = 12;
	const sm = new Set();
	for (let i = 0; i < it; i++) {
		sm.add(getRandom(rl, CHAR_SOURCES.numeric))
	}

	test.assert.equal(it, sm.size);
	for (const k of sm) {
		test.assert.equal(rl, k.length);
		test.assert.isTrue(/[0-9]+/.test(k));
	}
});

suite.test('random alpha lower', test => {
	const it = 100;
	const rl = 8;
	const sm = new Set();
	for (let i = 0; i < it; i++) {
		sm.add(getRandom(rl, CHAR_SOURCES.alphaLower));
	}

	test.assert.equal(it, sm.size);
	for (const k of sm) {
		test.assert.equal(rl, k.length);
		test.assert.isTrue(/[a-z]+/.test(k));
	}
});

suite.test('random alpha upper', test => {
	const it = 100;
	const rl = 8;
	const sm = new Set();
	for (let i = 0; i < it; i++) {
		sm.add(getRandom(rl, CHAR_SOURCES.alphaUpper));
	}

	test.assert.equal(it, sm.size);
	for (const k of sm) {
		test.assert.equal(rl, k.length);
		test.assert.isTrue(/[A-Z]+/.test(k));
	}
});

suite.test('random alpha all', test => {
	const it = 100;
	const rl = 8;
	const sm = new Set();
	for (let i = 0; i < it; i++) {
		sm.add(getRandom(rl, CHAR_SOURCES.alphaLower + CHAR_SOURCES.alphaUpper));
	}

	test.assert.equal(it, sm.size);
	for (const k of sm) {
		test.assert.equal(rl, k.length);
		test.assert.isTrue(/[a-zA-Z]+/.test(k));
	}
});