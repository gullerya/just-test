import { RANDOM_CHARSETS } from '/aut/bin/client/env-browser/browser-test-runner.js';

const suite = globalThis.getSuite('Test assets - random');

suite.test('random all', test => {
	const it = 100;
	const rl = 8;
	const sm = {};
	for (let i = 0; i < it; i++) {
		const rt = test.getRandom(rl);
		sm[rt] = true;
	}

	test.assertEqual(it, Object.keys(sm).length);
	Object.keys(sm).forEach(k => test.assertEqual(rl, k.length));
});

suite.test('random numeric', test => {
	const it = 100;
	const rl = 8;
	const sm = {};
	for (let i = 0; i < it; i++) {
		const rt = test.getRandom(rl, [RANDOM_CHARSETS.numeric]);
		sm[rt] = true;
	}

	test.assertEqual(it, Object.keys(sm).length);
	Object.keys(sm).forEach(k => test.assertEqual(rl, k.length));
	Object.keys(sm).forEach(k => test.assertTrue(/[0-9]+/.test(k)));
});

suite.test('random alpha lower', test => {
	const it = 100;
	const rl = 8;
	const sm = {};
	for (let i = 0; i < it; i++) {
		const rt = test.getRandom(rl, [RANDOM_CHARSETS.alphaLower]);
		sm[rt] = true;
	}

	test.assertEqual(it, Object.keys(sm).length);
	Object.keys(sm).forEach(k => test.assertEqual(rl, k.length));
	Object.keys(sm).forEach(k => test.assertTrue(/[a-z]+/.test(k)));
});

suite.test('random alpha upper', test => {
	const it = 100;
	const rl = 8;
	const sm = {};
	for (let i = 0; i < it; i++) {
		const rt = test.getRandom(rl, [RANDOM_CHARSETS.alphaUpper]);
		sm[rt] = true;
	}

	test.assertEqual(it, Object.keys(sm).length);
	Object.keys(sm).forEach(k => test.assertEqual(rl, k.length));
	Object.keys(sm).forEach(k => test.assertTrue(/[A-Z]+/.test(k)));
});

suite.test('random alpha all', test => {
	const it = 100;
	const rl = 8;
	const sm = {};
	for (let i = 0; i < it; i++) {
		const rt = test.getRandom(rl, [RANDOM_CHARSETS.alphaLower, RANDOM_CHARSETS.alphaUpper]);
		sm[rt] = true;
	}

	test.assertEqual(it, Object.keys(sm).length);
	Object.keys(sm).forEach(k => test.assertEqual(rl, k.length));
	Object.keys(sm).forEach(k => test.assertTrue(/[a-zA-Z]+/.test(k)));
});
