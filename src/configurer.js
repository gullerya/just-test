/**
 * Synchronously collects and builds an initial configuration, from:
 * - CL arguments
 * - configuraton file (found by CL argument 'config')
 */
import fs from 'fs';
import util from 'util';
import process from 'process';
import Logger from './logger/logger.js';

const logger = new Logger('JustTest [configurer]');

export default Object.freeze({
	givenConfig: resolveGivenConfig(),
	mergeConfig: mergeConfig
});

/**
 * one time running function to resolve 'givenConfig'
 */
function resolveGivenConfig() {
	const
		clargs = process.argv.slice(2);

	//	collect initial from CL args
	const configuration = argsFromCLArgs(clargs);
	logger.info('command line arguments:');
	logger.info(util.inspect(configuration, false, null, true));

	//	enrich from configuration file
	const configFile = configuration.config;
	if (!configFile) {
		logger.error('missing or invalid argument "config" (example: config=/path/to/config.json)');
		process.exit(1);
	}
	delete configuration.config;
	try {
		const rawConfiguration = fs.readFileSync(configFile, { encoding: 'utf8' });
		Object.assign(configuration, JSON.parse(rawConfiguration));
	} catch (e) {
		logger.error('failed to READ configuration', e);
		process.exit(1);
	}

	logger.info('given configuration resolved:');
	logger.info(util.inspect(configuration, false, null, true));
	return Object.freeze(configuration);
}

function argsFromCLArgs(clArgs) {
	const result = {
		interactive: true
	};
	clArgs
		.map(arg => arg.split('='))
		.filter(pair => pair.length === 2)
		.forEach(([k, v]) => {
			switch (k) {
				case 'interactive':
					result[k] === v === 'true';
					break;
				default:
					result[k] = v;
			}
		});
	return result;
}

function mergeConfig(a, b) {
	if (!a || typeof a !== 'object') {
		throw new Error('target to merge MUST be an object');
	}
	if (typeof b !== 'object' && b !== undefined) {
		throw new Error('source for merge MUST be an objects');
	}
	if (Array.isArray(a) && b && !Array.isArray(b)) {
		throw new Error(`merged graph expected to be an Array since the target ${a} is an Array`);
	}

	if (b === undefined) {
		return a;										//	undefined 'b' means preserve 'a'
	} else if (b === null) {
		return null;									//	null 'b' override 'a'
	} else if (Array.isArray(a)) {
		const result = a.slice(0);
		b.forEach(se => {
			if (typeof se === 'object') {				//	objects push after cloned
				result.push(mergeConfig({}, se));
			} else {									//	primitives pushed if not included
				if (result.indexOf(se) < 0) {
					result.push(se);
				}
			}
		});
		return result;
	} else {
		const result = {};
		Object.keys(a).forEach(k => {
			if (Object.prototype.hasOwnProperty.call(b, k)) {	//	each existing property of 'b' to be taken
				if (typeof a[k] === 'object') {
					result[k] = mergeConfig(a[k], b[k]);		//	objects are recursively merged
				} else {
					result[k] = b[k];							//	plain data just copied
				}
			} else {
				result[k] = a[k];								//	when 'b' doesn't has property - keep the 'a'
			}
		});
		return result;
	}
}