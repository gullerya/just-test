import { expect } from 'chai';
import { getSuite } from 'just-test/suite';
import { buildJTFileCov } from '../../src/coverage/model/model-utils.js';

const suite = getSuite('Coverage utils');

suite.test('build model - negative (bad source URL, not a string)', async () => {
	await expect(buildJTFileCov(5)).rejectedWith('source URL MUST be a non-empty string');
});

suite.test('build model - negative (bad source URL, empty string)', async () => {
	await assert.throws(async () => await buildJTFileCov(''), 'source URL MUST be a non-empty string');
});

