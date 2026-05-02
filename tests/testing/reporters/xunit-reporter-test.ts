import { test } from '@gullerya/just-test';
import { assert } from '@gullerya/just-test/assert';
import xUnit from '../../../src/testing/reporters/xunit-reporter.ts';

//	Helpers — build plausible Session/Suite/Test shapes matching what
//	StateService hands to the reporter. The reporter only touches the
//	fields it reads; we populate exactly those.

type Run = {
	status: string;
	time: number;
	error?: { type: string; message: string; stack: string } | null;
};

type TestShape = {
	name: string;
	lastRun: Run | null;
};

type SuiteShape = {
	name: string;
	timestamp: number;
	time: number;
	tests: TestShape[];
};

type SessionShape = {
	timestamp: number;
	time: number;
	errors: { type: string; message: string; stack: string }[];
	suites: SuiteShape[];
};

function emptySession(): SessionShape {
	return {
		timestamp: Date.UTC(2026, 0, 1, 12, 0, 0),
		time: 0,
		errors: [],
		suites: []
	};
}

function passRun(time = 10): Run {
	return { status: 'pass', time };
}

function failRun(time = 12): Run {
	return {
		status: 'fail',
		time,
		error: { type: 'AssertionError', message: 'bad', stack: 'stack-fail' }
	};
}

function errorRun(time = 14): Run {
	return {
		status: 'error',
		time,
		error: { type: 'TypeError', message: 'boom', stack: 'stack-error' }
	};
}

function skipRun(): Run {
	return { status: 'skip', time: 0 };
}

//	-----------------------------------------------------------------
//	Shape assertions
//	-----------------------------------------------------------------

test('xUnit reporter - exported descriptor shape', () => {
	assert.strictEqual(xUnit.type, 'xUnit');
	assert.strictEqual(typeof xUnit.report, 'function');
	//	descriptor is frozen
	assert.throws(() => { (xUnit as any).type = 'other'; });
});

//	-----------------------------------------------------------------
//	Empty session
//	-----------------------------------------------------------------

test('xUnit reporter - empty session produces root with zero counters', () => {
	const xml = xUnit.report(emptySession() as any);
	assert.isTrue(xml.includes('<testsuites'));
	//	counters set explicitly to zero on the root
	assert.isTrue(xml.includes('tests="0"'));
	assert.isTrue(xml.includes('failures="0"'));
	assert.isTrue(xml.includes('errors="0"'));
	assert.isTrue(xml.includes('skips="0"'));
	//	timestamp is serialized as ISO string of the session timestamp
	assert.isTrue(xml.includes('2026-01-01T12:00:00.000Z'));
	//	no child <testsuite> elements when there are no suites
	assert.isFalse(xml.includes('<testsuite '));
});

//	-----------------------------------------------------------------
//	Session-level errors
//	-----------------------------------------------------------------

test('xUnit reporter - session errors appended to root and counted', () => {
	const s = emptySession();
	s.errors.push({ type: 'Error', message: 'import-failure', stack: 'boom-stack' });
	s.errors.push({ type: 'Error', message: 'second', stack: 'second-stack' });
	const xml = xUnit.report(s as any);

	assert.isTrue(xml.includes('errors="2"'));
	assert.isTrue(xml.includes('message="import-failure"'));
	assert.isTrue(xml.includes('message="second"'));
	assert.isTrue(xml.includes('boom-stack'));
});

//	-----------------------------------------------------------------
//	Suites and per-status rendering
//	-----------------------------------------------------------------

test('xUnit reporter - suite with passing test emits testcase with status=pass', () => {
	const s = emptySession();
	s.suites.push({
		name: 'suite-a',
		timestamp: Date.UTC(2026, 0, 1, 12, 0, 0),
		time: 100,
		tests: [{ name: 'happy', lastRun: passRun(25) }]
	});
	const xml = xUnit.report(s as any);

	assert.isTrue(xml.includes('<testsuite'));
	assert.isTrue(xml.includes('name="suite-a"'));
	assert.isTrue(xml.includes('tests="1"'));
	assert.isTrue(xml.includes('failures="0"'));
	assert.isTrue(xml.includes('errors="0"'));
	assert.isTrue(xml.includes('skips="0"'));
	assert.isTrue(xml.includes('name="happy"'));
	assert.isTrue(xml.includes('status="pass"'));
	//	no failure/error/skipped child on a passing test
	assert.isFalse(xml.includes('<failure'));
	assert.isFalse(xml.includes('<skipped'));
});

test('xUnit reporter - failing test emits <failure> with type/message/stack', () => {
	const s = emptySession();
	s.suites.push({
		name: 'suite-fail',
		timestamp: Date.UTC(2026, 0, 1, 12, 0, 0),
		time: 30,
		tests: [{ name: 't-fail', lastRun: failRun() }]
	});
	const xml = xUnit.report(s as any);

	assert.isTrue(xml.includes('<failure'));
	assert.isTrue(xml.includes('type="AssertionError"'));
	assert.isTrue(xml.includes('message="bad"'));
	assert.isTrue(xml.includes('stack-fail'));
	//	session counts
	assert.isTrue(xml.includes('failures="1"'));
});

test('xUnit reporter - errored test emits <error> with type/message/stack', () => {
	const s = emptySession();
	s.suites.push({
		name: 'suite-err',
		timestamp: Date.UTC(2026, 0, 1, 12, 0, 0),
		time: 30,
		tests: [{ name: 't-err', lastRun: errorRun() }]
	});
	const xml = xUnit.report(s as any);

	//	the testcase-level <error> and per-suite errors counter
	assert.isTrue(xml.includes('type="TypeError"'));
	assert.isTrue(xml.includes('message="boom"'));
	assert.isTrue(xml.includes('stack-error'));
	assert.isTrue(xml.includes('errors="1"'));
});

test('xUnit reporter - skipped test emits <skipped> element', () => {
	const s = emptySession();
	s.suites.push({
		name: 'suite-skip',
		timestamp: Date.UTC(2026, 0, 1, 12, 0, 0),
		time: 0,
		tests: [{ name: 't-skip', lastRun: skipRun() }]
	});
	const xml = xUnit.report(s as any);

	assert.isTrue(xml.includes('<skipped'));
	assert.isTrue(xml.includes('skips="1"'));
	//	skipped tests still emit status attribute
	assert.isTrue(xml.includes('status="skip"'));
});

test('xUnit reporter - test without lastRun omits status / child elements', () => {
	const s = emptySession();
	s.suites.push({
		name: 'suite-noop',
		timestamp: Date.UTC(2026, 0, 1, 12, 0, 0),
		time: 0,
		tests: [{ name: 'no-run', lastRun: null }]
	});
	const xml = xUnit.report(s as any);

	//	testcase element exists with the name
	assert.isTrue(xml.includes('name="no-run"'));
	//	no status, time, or child status element on a test with no run
	assert.isFalse(xml.includes('status="pass"'));
	assert.isFalse(xml.includes('<failure'));
	assert.isFalse(xml.includes('<skipped'));
	//	counts for the suite — 1 test recorded, 0 in each status bucket
	assert.isTrue(xml.includes('tests="1"'));
	assert.isTrue(xml.includes('failures="0"'));
	assert.isTrue(xml.includes('errors="0"'));
	assert.isTrue(xml.includes('skips="0"'));
});

//	-----------------------------------------------------------------
//	Aggregation across suites + mixed statuses
//	-----------------------------------------------------------------

test('xUnit reporter - mixed suite aggregates counters correctly', () => {
	const s = emptySession();
	s.suites.push({
		name: 'mixed',
		timestamp: Date.UTC(2026, 0, 1, 12, 0, 0),
		time: 50,
		tests: [
			{ name: 'p', lastRun: passRun() },
			{ name: 'f', lastRun: failRun() },
			{ name: 'e', lastRun: errorRun() },
			{ name: 's', lastRun: skipRun() },
			{ name: 'p2', lastRun: passRun() }
		]
	});
	const xml = xUnit.report(s as any);

	//	session totals
	assert.isTrue(xml.includes('tests="5"'));
	assert.isTrue(xml.includes('failures="1"'));
	assert.isTrue(xml.includes('errors="1"'));
	assert.isTrue(xml.includes('skips="1"'));
});

test('xUnit reporter - multiple suites all appear in output', () => {
	const s = emptySession();
	s.suites.push({
		name: 'alpha',
		timestamp: Date.UTC(2026, 0, 1, 12, 0, 0),
		time: 20,
		tests: [{ name: 'a1', lastRun: passRun() }]
	});
	s.suites.push({
		name: 'beta',
		timestamp: Date.UTC(2026, 0, 1, 12, 0, 5),
		time: 30,
		tests: [{ name: 'b1', lastRun: failRun() }]
	});
	const xml = xUnit.report(s as any);

	assert.isTrue(xml.includes('name="alpha"'));
	assert.isTrue(xml.includes('name="beta"'));
	assert.isTrue(xml.includes('name="a1"'));
	assert.isTrue(xml.includes('name="b1"'));
	//	session-level rollup
	assert.isTrue(xml.includes('tests="2"'));
	assert.isTrue(xml.includes('failures="1"'));
});

//	-----------------------------------------------------------------
//	Timing conversion (ms → seconds, 4-decimal precision)
//	-----------------------------------------------------------------

test('xUnit reporter - time attribute converts millis to seconds', () => {
	const s = emptySession();
	s.time = 1500; //	1.5 s on the root
	s.suites.push({
		name: 'timing',
		timestamp: Date.UTC(2026, 0, 1, 12, 0, 0),
		time: 2500, //	2.5 s on the suite
		tests: [{ name: 't', lastRun: passRun(1234) /* 1.234 s */ }]
	});
	const xml = xUnit.report(s as any);

	assert.isTrue(xml.includes('time="1.5"'));
	assert.isTrue(xml.includes('time="2.5"'));
	assert.isTrue(xml.includes('time="1.234"'));
});

//	-----------------------------------------------------------------
//	Defensive: fail/error without an `error` payload still emits the
//	corresponding child element (per reporter's `if (lastRun.error)`
//	guard) and updates counters.
//	-----------------------------------------------------------------

test('xUnit reporter - fail run without error payload still increments failure count', () => {
	const s = emptySession();
	s.suites.push({
		name: 'bare-fail',
		timestamp: Date.UTC(2026, 0, 1, 12, 0, 0),
		time: 5,
		tests: [{ name: 'x', lastRun: { status: 'fail', time: 5, error: null } }]
	});
	const xml = xUnit.report(s as any);

	assert.isTrue(xml.includes('<failure'));
	assert.isTrue(xml.includes('failures="1"'));
});
