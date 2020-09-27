/**
 * Synchronously collects and builds an initial configuration, from:
 * - CL arguments
 * - configuraton file (found by CL argument 'config')
 * 
 * Collects and holds the effective configuration built by each service:
 * - responsibility of services to report effective configuration
 */
import fs from 'fs';
import util from 'util';
import process from 'process';
import Logger from './logger/logger.js';

const logger = new Logger({ context: 'configurer' });
const effectiveConfig = {};

export const givenConfig = resolveGivenConfig();

export function reportEffectiveConfig(key, config) {
	if (!key || typeof key !== 'string') {
		throw new Error(`key MUST be a non-null string; got '${key}'`);
	}
	if (!config) {
		throw new Error(`effective config MUST be a defined meaningful; got '${config}'`);
	}
	if (key in effectiveConfig) {
		throw new Error(`effective config under key '${key}' already reported`);
	}
	effectiveConfig[key] = config;
}

export function obtainEffectiveConfig(key) {
	if (!key || typeof key !== 'string') {
		throw new Error(`key MUST be a non-null string; got '${key}'`);
	}
	if (!(key in effectiveConfig)) {
		throw new Error(`no effective config under key '${key}' found`);
	}
	return effectiveConfig[key];
}

/**
 * one time running function to resolve 'givenConfig'
 */
function resolveGivenConfig() {
	const result = {};

	//	get command line arguments
	const clConfig = argsFromCLArgs(process.argv.slice(2));

	//	get configuration file
	const configFile = clConfig.config;
	if (!configFile) {
		logger.error('missing or invalid argument "config" (example: config=/path/to/config.json)');
		process.exit(1);
	}
	try {
		logger.info(`reading configuration from '${configFile}'...`);
		const rawConfiguration = fs.readFileSync(configFile, { encoding: 'utf8' });
		Object.assign(result, JSON.parse(rawConfiguration));
	} catch (e) {
		logger.error('failed to READ configuration', e);
		process.exit(1);
	}

	//	merge command line arguments
	result.clArguments = clConfig;

	logger.info('given configuration resolved:');
	logger.info(util.inspect(result, false, null, true));
	return Object.freeze(result);
}

function argsFromCLArgs(clArgs) {
	const result = {};
	clArgs
		.map(arg => arg.split('='))
		.filter(pair => pair.length === 2)
		.forEach(([k, v]) => {
			switch (k) {
				default:
					result[k] = v;
			}
		});
	return result;
}

// function mergeConfig(a, b) {
// 	if (!a || typeof a !== 'object') {
// 		throw new Error('target to merge MUST be an object');
// 	}
// 	if (typeof b !== 'object' && b !== undefined) {
// 		throw new Error('source for merge MUST be an objects');
// 	}
// 	if (Array.isArray(a) && b && !Array.isArray(b)) {
// 		throw new Error(`merged graph expected to be an Array since the target ${a} is an Array`);
// 	}

// 	if (b === undefined) {
// 		return a;										//	undefined 'b' means preserve 'a'
// 	} else if (b === null) {
// 		return null;									//	null 'b' override 'a'
// 	} else if (Array.isArray(a)) {
// 		const result = a.slice(0);
// 		b.forEach(se => {
// 			if (typeof se === 'object') {				//	objects push after cloned
// 				result.push(mergeConfig({}, se));
// 			} else {									//	primitives pushed if not included
// 				if (result.indexOf(se) < 0) {
// 					result.push(se);
// 				}
// 			}
// 		});
// 		return result;
// 	} else {
// 		const result = {};
// 		Object.keys(a).forEach(k => {
// 			if (Object.prototype.hasOwnProperty.call(b, k)) {	//	each existing property of 'b' to be taken
// 				if (typeof a[k] === 'object') {
// 					result[k] = mergeConfig(a[k], b[k]);		//	objects are recursively merged
// 				} else {
// 					result[k] = b[k];							//	plain data just copied
// 				}
// 			} else {
// 				result[k] = a[k];								//	when 'b' doesn't has property - keep the 'a'
// 			}
// 		});
// 		return result;
// 	}
// }