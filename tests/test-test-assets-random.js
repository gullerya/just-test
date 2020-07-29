import { getSuite } from '/core/just-test.js';
import { RANDOM_CHARSETS } from '/core/test.js';

const suite = getSuite({ name: 'Test assets - random' });

suite.runTest({ name: 'random all' }, test => {
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

suite.runTest({ name: 'random numeric' }, test => {
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

suite.runTest({ name: 'random alpha lower' }, test => {
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

suite.runTest({ name: 'random alpha upper' }, test => {
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

suite.runTest({ name: 'random alpha all' }, test => {
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
