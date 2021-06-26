/**
 * Server Runner is a CLI tool/entry-point:
 * - processes envs/args
 * - prepares effective config
 * - starts the server
 */
import fs from 'fs';
import Logger from './logger/logger.js';
import buildConfig from './configuration/server-configurer.js';
import { start as serverStart } from './server-service.js';

const logger = new Logger({ context: 'JustTest CLI' })

logger.info('Starting JustTest server');

Promise
	.all([
		collectArgs(),
		collectEnvs()
	])
	.then(([args, envs]) => {
		const customConfig = {};
		const enar = Object.assign({}, envs, args);
		if (enar.config_file) {
			const cf = JSON.parse(fs.readFileSync(enar.config_file));
			Object.assign(customConfig, cf);
		}
		Object.assign(customConfig, enar);
		return buildConfig(customConfig);
	})
	.then(effectiveConfig => {
		logger.info('effective configuration:', effectiveConfig);
		logger.info('starting server...');
		return serverStart(effectiveConfig);
	})
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

async function collectEnvs() {
	//	TODO: resolve ENV keys to normalized config object
	return Object.assign({}, process.env);
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