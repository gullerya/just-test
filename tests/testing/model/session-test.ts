import { test } from '@gullerya/just-test';
import { assert } from '@gullerya/just-test/assert';
import { Session } from '../../../src/testing/model/session.ts';
import { Suite } from '../../../src/testing/model/suite.ts';

//	-----------------------------------------------------------------
//	Construction
//	-----------------------------------------------------------------

test('Session - defaults', () => {
	const session = new Session();
	assert.strictEqual(session.sessionId, 'unspecified');
	assert.strictEqual(session.environmentId, 'unspecified');
	assert.strictEqual(session.timestamp, 0);
	assert.strictEqual(session.time, 0);
	assert.deepStrictEqual(session.suites, []);
	assert.deepStrictEqual(session.errors, []);
	assert.strictEqual(session.total, 0);
	assert.strictEqual(session.done, 0);
	assert.strictEqual(session.skip, 0);
	assert.strictEqual(session.pass, 0);
	assert.strictEqual(session.fail, 0);
	assert.strictEqual(session.error, 0);
	assert.strictEqual(session.onlyMode, false);
	assert.strictEqual(session.coverage, null);
});

test('Session - instance is sealed (no new fields)', () => {
	const session = new Session();
	assert.throws(() => { (session as any).bogus = 1; });
});

test('Session - existing fields remain mutable', () => {
	const session = new Session();
	session.sessionId = 'abc';
	session.environmentId = 'env-1';
	session.pass = 7;
	session.onlyMode = true;
	session.coverage = [{ url: 'x' }];
	session.suites.push(new Suite());
	session.errors.push(Object.assign(new Error('x'), { type: 'Error' }) as any);
	assert.strictEqual(session.sessionId, 'abc');
	assert.strictEqual(session.environmentId, 'env-1');
	assert.strictEqual(session.pass, 7);
	assert.strictEqual(session.onlyMode, true);
	assert.strictEqual(session.suites.length, 1);
	assert.strictEqual(session.errors.length, 1);
});

//	-----------------------------------------------------------------
//	toJSON
//	-----------------------------------------------------------------

test('Session#toJSON - default shape includes onlyMode and coverage', () => {
	const session = new Session();
	const json = session.toJSON() as any;
	assert.deepStrictEqual(json, {
		sessionId: 'unspecified',
		environmentId: 'unspecified',
		timestamp: 0,
		time: 0,
		suites: [],
		errors: [],
		total: 0,
		done: 0,
		skip: 0,
		pass: 0,
		fail: 0,
		error: 0,
		onlyMode: false,
		coverage: null
	});
});

test('Session#toJSON - reflects mutated values', () => {
	const session = new Session();
	session.sessionId = 'sid';
	session.environmentId = 'eid';
	session.timestamp = 10;
	session.time = 20;
	session.total = 3;
	session.done = 3;
	session.skip = 0;
	session.pass = 2;
	session.fail = 1;
	session.error = 0;
	session.onlyMode = true;
	session.coverage = [{ url: 'a', functions: [] }];

	const json = session.toJSON() as any;
	assert.strictEqual(json.sessionId, 'sid');
	assert.strictEqual(json.environmentId, 'eid');
	assert.strictEqual(json.timestamp, 10);
	assert.strictEqual(json.time, 20);
	assert.strictEqual(json.total, 3);
	assert.strictEqual(json.done, 3);
	assert.strictEqual(json.pass, 2);
	assert.strictEqual(json.fail, 1);
	assert.strictEqual(json.onlyMode, true);
	assert.deepStrictEqual(json.coverage, [{ url: 'a', functions: [] }]);
});

test('Session#toJSON - nested suites pass through their own toJSON', () => {
	const session = new Session();
	const suite = new Suite();
	suite.name = 'nested';
	suite.onlyMode = true;
	session.suites.push(suite);

	//	JSON.stringify forces a cascade through toJSON on every level,
	//	so onlyMode on the nested suite MUST survive the round trip
	const parsed = JSON.parse(JSON.stringify(session));
	assert.strictEqual(parsed.suites.length, 1);
	assert.strictEqual(parsed.suites[0].name, 'nested');
	assert.strictEqual(parsed.suites[0].onlyMode, true);
});

test('Session#toJSON - errors array passes through', () => {
	const session = new Session();
	const e: any = new Error('boom');
	e.type = 'Error';
	session.errors.push(e);
	const json = session.toJSON() as any;
	assert.strictEqual(json.errors.length, 1);
	assert.strictEqual(json.errors[0].message, 'boom');
});

test('Session - JSON.stringify routes through toJSON', () => {
	const session = new Session();
	session.sessionId = 'stringify';
	session.onlyMode = true;
	const parsed = JSON.parse(JSON.stringify(session));
	assert.strictEqual(parsed.sessionId, 'stringify');
	assert.strictEqual(parsed.onlyMode, true);
});
