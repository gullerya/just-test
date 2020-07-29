import fs from 'fs';
import util from 'util';
import Logger from './logger/logger.js';

const logger = new Logger('JustTest [configurer]');

export default Object.freeze({
	givenConfig: resolveGivenConfig(),
	mergeConfig: mergeConfig
});

function resolveGivenConfig() {
	const
		clargs = process.argv.slice(2),
		args = {};

	//	collect arguments
	clargs.forEach(arg => {
		const parts = arg.split('=');
		if (parts.length === 2) {
			args[parts[0]] = parts[1];
		}
	});

	//	valid required
	const configLocation = args.config;
	if (!configLocation) {
		logger.error('missing or invalid argument "config" (example: c=/path/to/config.json)');
		process.exit(1);
	}

	logger.info('assembling given configuration...');
	logger.info(`execution directory '${process.cwd()}'`);
	logger.info('execution arguments collected as following:');
	logger.info(util.inspect(args, false, null, true));

	//	read configuration
	let rawConfiguration;
	try {
		rawConfiguration = fs.readFileSync(configLocation, { encoding: 'utf8' });
	} catch (e) {
		logger.error('failed to READ configuration', e);
		process.exit(1);
	}

	//	parse configuration and merge with defaults
	const configuration = JSON.parse(rawConfiguration);
	Object.keys(args).forEach(aKey => {
		if (aKey.indexOf('-') !== 0) {
			const ckPath = aKey.split('.');
			let target = configuration;
			for (let i = 0, l = ckPath.length - 1; i < l; i++) {
				const nextPNode = ckPath[i];
				if (target[nextPNode] && typeof target[nextPNode] === 'object') {
					target = target[nextPNode];
				} else if (target[nextPNode] === undefined || target[nextPNode] === null) {
					target = target[nextPNode] = {};
				} else {
					throw new Error(`command line config property '${aKey}' conflicts with file config property '${nextPNode}' which value is '${target[nextPNode]}'`);
				}
			}
		}
	});

	logger.info('given configuration assembled');
	return Object.freeze(configuration);
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
			if (b.hasOwnProperty(k)) {					//	each existing property of 'b' to be taken
				if (typeof a[k] === 'object') {
					result[k] = mergeConfig(a[k], b[k]);		//	objects are recursively merged
				} else {
					result[k] = b[k];					//	plain data just copied
				}
			} else {
				result[k] = a[k];							//	when 'b' doesn't has property - keep the 'a'
			}
		});
		return result;
	}
};