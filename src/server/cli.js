/**
 * Server Runner is a CLI tool/entry-point:
 * - processes envs/args
 * - prepares effective config
 * - starts the server
 */
import fs from 'fs';
import Logger from './logger/logger.js';
import buildConfig from './configuration/server-configurer.js';
import { start as serverStart, stop } from './server-service.js';

export {
	start,
	stop
}

const logger = new Logger({ context: 'JustTest CLI' });
const SUPPORTED_ENV_KEY = [];

if (process.argv[1] && process.argv[1].endsWith('cli.js')) {
	start()
		.then(serverService => {
			return serverService.stopPromise;
		})
		.catch(error => {
			logger.error(error);
			logger.error('failed to start server due to previous error/s');
		})
		.finally(() => {
			logger.info('JustTest server exited');
		});
}

async function start() {
	logger.info('Starting JustTest server');
	const [args, envs] = await Promise.all([collectArgs(), collectEnvs()]);

	//	resolve effective configuration
	const customConfig = {};
	const enar = Object.assign({}, envs, args);
	if (enar.config_file) {
		const cf = JSON.parse(fs.readFileSync(enar.config_file));
		Object.assign(customConfig, cf);
	}
	Object.assign(customConfig, enar);
	const effectiveConfig = buildConfig(customConfig);

	//	init server service
	logger.info('effective configuration:', effectiveConfig);
	logger.info('starting server...');
	const serverService = serverStart(effectiveConfig);

	return serverService;
}

async function collectEnvs() {
	const result = {};
	for (const [key, val] of Object.entries(process.env)) {
		if (SUPPORTED_ENV_KEY.includes(key)) {
			result[key] = val;
		}
	}
	return result;
}

async function collectArgs() {
	//	TODO: resolve ARG keys to normalized config object
	const result = {};
	for (const a of process.argv) {
		if (a.includes('=')) {
			const [key, value] = a.split('=');
			if (!key) {
				throw new Error(`invalid argument '${a}'`);
			}
			result[key] = value;
		}
	}
	return result;
}