import {
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

	test.assertEqual(it, sm.size);
	for (const k of sm) {
		test.assertEqual(rl, k.length);
	}
});

suite.test('random numeric', test => {
	const it = 100;
	const rl = 12;
	const sm = new Set();
	for (let i = 0; i < it; i++) {
		sm.add(getRandom(rl, CHAR_SOURCES.numeric))
	}

	test.assertEqual(it, sm.size);
	for (const k of sm) {
		test.assertEqual(rl, k.length);
		test.assertTrue(/[0-9]+/.test(k));
	}
});

suite.test('random alpha lower', test => {
	const it = 100;
	const rl = 8;
	const sm = new Set();
	for (let i = 0; i < it; i++) {
		sm.add(getRandom(rl, CHAR_SOURCES.alphaLower));
	}

	test.assertEqual(it, sm.size);
	for (const k of sm) {
		test.assertEqual(rl, k.length);
		test.assertTrue(/[a-z]+/.test(k));
	}
});

suite.test('random alpha upper', test => {
	const it = 100;
	const rl = 8;
	const sm = new Set();
	for (let i = 0; i < it; i++) {
		sm.add(getRandom(rl, CHAR_SOURCES.alphaUpper));
	}

	test.assertEqual(it, sm.size);
	for (const k of sm) {
		test.assertEqual(rl, k.length);
		test.assertTrue(/[A-Z]+/.test(k));
	}
});

suite.test('random alpha all', test => {
	const it = 100;
	const rl = 8;
	const sm = new Set();
	for (let i = 0; i < it; i++) {
		sm.add(getRandom(rl, CHAR_SOURCES.alphaLower + CHAR_SOURCES.alphaUpper));
	}

	test.assertEqual(it, sm.size);
	for (const k of sm) {
		test.assertEqual(rl, k.length);
		test.assertTrue(/[a-zA-Z]+/.test(k));
	}
});
