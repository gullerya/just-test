import { test } from '@gullerya/just-test';
import { assert } from '@gullerya/just-test/assert';
import covConf from '../../src/coverage/coverage-configurer.js';

test('coverage config - empty config, empty envs', () => {
	let cc = covConf();

	assert.deepStrictEqual(cc, {
		include: [],
		exclude: ['*.min.js'],
		reports: [{ type: 'lcov' }]
	});
});

test('coverage config - bad config, some envs', () => {
	assert.throws(() => covConf('text', {}), 'MUST be a non-null object');
});

test('coverage config - some config, bad envs', () => {
	assert.throws(
		() => covConf({}, 'text'),
		'coverage supported ONLY'
	);
});

test('coverage config - unsupported env - empty', () => {
	assert.throws(
		() => covConf({}, {}),
		'coverage supported ONLY'
	);
});

test('coverage config - supported env - chromium', () => {
	let cc = covConf({}, { browser: { type: 'chromium' } });

	assert.deepStrictEqual(cc, {
		include: [],
		exclude: ['*.min.js'],
		reports: [{ type: 'lcov' }]
	});
});

test('coverage config - supported env - node', () => {
	let cc = covConf({}, { node: true });

	assert.deepStrictEqual(cc, {
		include: [],
		exclude: ['*.min.js'],
		reports: [{ type: 'lcov' }]
	});
});

test('coverage config - enriching the include', () => {
	let cc = covConf({
		include: ['some/path']
	}, { node: true });

	assert.deepStrictEqual(cc, {
		include: ['some/path'],
		exclude: ['*.min.js'],
		reports: [{ type: 'lcov' }]
	});
});

test('coverage config - enriching the exclude', () => {
	let cc = covConf({
		include: ['some/path'],
		exclude: ['some/else']
	}, { node: true });

	assert.deepStrictEqual(cc, {
		include: ['some/path'],
		exclude: ['*.min.js', 'some/else'],
		reports: [{ type: 'lcov' }]
	});
});

test('coverage config - bad report type - not an array', () => {
	assert.throws(() =>
		covConf({
			include: ['some/path'],
			reports: {}
		}, { node: true }),
		'MUST be an array of non-null'
	);
});

test('coverage config - bad report type - null in array', () => {
	assert.throws(() =>
		covConf({
			include: ['some/path'],
			reports: [null]
		}, { node: true }),
		'MUST be an array of non-null'
	);
});

test('coverage config - bad report type - wrong type', () => {
	assert.throws(() =>
		covConf({
			include: ['some/path'],
			reports: [{}]
		}, { node: true }),
		'report type MUST be a one'
	);
});

test('coverage config - correct report type', () => {
	let cc = covConf({
		include: ['some/path'],
		reports: [{ type: 'lcov' }]
	}, { node: true });

	assert.deepStrictEqual(cc, {
		include: ['some/path'],
		exclude: ['*.min.js'],
		reports: [{ type: 'lcov' }]
	});
});