import { test } from '@gullerya/just-test';
import { assert } from '@gullerya/just-test/assert';
import { Suite } from '../../../src/testing/model/suite.ts';

//	-----------------------------------------------------------------
//	Construction
//	-----------------------------------------------------------------

test('Suite - defaults', () => {
	const suite = new Suite();
	assert.strictEqual(suite.id, 'unspecified');
	assert.strictEqual(suite.name, 'unspecified');
	assert.deepStrictEqual(suite.config, {});
	assert.strictEqual(suite.timestamp, 0);
	assert.strictEqual(suite.time, 0);
	assert.deepStrictEqual(suite.tests, []);
	assert.strictEqual(suite.total, 0);
	assert.strictEqual(suite.done, 0);
	assert.strictEqual(suite.skip, 0);
	assert.strictEqual(suite.pass, 0);
	assert.strictEqual(suite.fail, 0);
	assert.strictEqual(suite.error, 0);
	assert.strictEqual(suite.onlyMode, false);
});

test('Suite - instance is sealed (no new fields)', () => {
	const suite = new Suite();
	assert.throws(() => { (suite as any).bogus = 1; });
});

test('Suite - existing fields remain mutable (counters, tests array, onlyMode)', () => {
	const suite = new Suite();
	suite.name = 'mySuite';
	suite.pass = 3;
	suite.onlyMode = true;
	suite.tests.push({ name: 't1' });
	assert.strictEqual(suite.name, 'mySuite');
	assert.strictEqual(suite.pass, 3);
	assert.strictEqual(suite.onlyMode, true);
	assert.strictEqual(suite.tests.length, 1);
});

//	-----------------------------------------------------------------
//	toJSON
//	-----------------------------------------------------------------

test('Suite#toJSON - default shape includes onlyMode', () => {
	const suite = new Suite();
	const json = suite.toJSON() as any;
	assert.deepStrictEqual(json, {
		id: 'unspecified',
		name: 'unspecified',
		config: {},
		timestamp: 0,
		time: 0,
		tests: [],
		total: 0,
		done: 0,
		skip: 0,
		pass: 0,
		fail: 0,
		error: 0,
		onlyMode: false
	});
});

test('Suite#toJSON - reflects mutated values', () => {
	const suite = new Suite();
	suite.id = 's1';
	suite.name = 'my-suite';
	suite.config = { sync: true };
	suite.timestamp = 10;
	suite.time = 20;
	suite.total = 5;
	suite.done = 5;
	suite.skip = 1;
	suite.pass = 3;
	suite.fail = 1;
	suite.error = 0;
	suite.onlyMode = true;
	suite.tests.push({ name: 't1' }, { name: 't2' });

	const json = suite.toJSON() as any;
	assert.strictEqual(json.id, 's1');
	assert.strictEqual(json.name, 'my-suite');
	assert.deepStrictEqual(json.config, { sync: true });
	assert.strictEqual(json.timestamp, 10);
	assert.strictEqual(json.time, 20);
	assert.strictEqual(json.total, 5);
	assert.strictEqual(json.done, 5);
	assert.strictEqual(json.skip, 1);
	assert.strictEqual(json.pass, 3);
	assert.strictEqual(json.fail, 1);
	assert.strictEqual(json.error, 0);
	assert.strictEqual(json.onlyMode, true);
	assert.strictEqual(json.tests.length, 2);
	assert.strictEqual(json.tests[0].name, 't1');
});

test('Suite - JSON.stringify routes through toJSON', () => {
	const suite = new Suite();
	suite.name = 'stringify-me';
	suite.onlyMode = true;
	const parsed = JSON.parse(JSON.stringify(suite));
	assert.strictEqual(parsed.name, 'stringify-me');
	assert.strictEqual(parsed.onlyMode, true);
});
