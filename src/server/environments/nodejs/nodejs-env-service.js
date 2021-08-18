/**
 * This will launch NodeJS environment, that is:
 * - spawning process/es as needed for encapsulated tests run
 * - running all tests in those processes
 * - collect results and shut down child processes
 * 
 * @param {Object} envConfig environment configuration
 * @param {string} envConfig.node in this context expected always to equal true
 */
import { fork } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SESSION_ENVIRONMENT_KEYS } from '../../../common/constants.js';
import Logger, { FileOutput } from '../../logger/logger.js';
import { config as serverConfig } from '../../server-service.js';
import { EnvironmentBase } from '../environment-base.js';

export default launch;

const logger = new Logger({ context: 'NodeJS env service' });
const ownDir = dirname(fileURLToPath(import.meta.url));

class NodeEnvImpl extends EnvironmentBase {

	/**
	 * construct browser environment for a specific session
	 * 
	 * @param {string} sessionId session ID
	 * @param {object} envConfig environment setup
	 */
	constructor(sessionId, envConfig) {
		super(sessionId);

		this.envConfig = envConfig;
		this.consoleLogger = null;
		this.dismissPromise = null;
		this.timeoutHandle = null;

		Object.seal(this);
	}

	async launch() {
		logger.info(`launching 'NodeJS' environment...`);

		const versionNamed = `nodejs-${process.version.replace(/^[^0-9]+/, '')}`;
		this.consoleLogger = new FileOutput(`./reports/logs/${versionNamed}.log`);
		const nLogger = new Logger({
			context: versionNamed,
			outputs: [this.consoleLogger]
		});

		const entryPointRunnerPath = resolve(ownDir, '../../../runner/environments/nodejs/nodejs-session-runner.js');
		const nodeEnv = fork(
			entryPointRunnerPath,
			[
				`${SESSION_ENVIRONMENT_KEYS.SESSION_ID}=${this.sessionId}`,
				`${SESSION_ENVIRONMENT_KEYS.ENVIRONMENT_ID}=${this.envConfig.id}`,
				`${SESSION_ENVIRONMENT_KEYS.SERVER_ORIGIN}=${serverConfig.origin}`
			],
			{
				stdio: 'pipe',
				timeout: this.envConfig.tests.ttl
			}
		);
		nodeEnv.stdout.on('data', data => nLogger.info(data.toString().trim()));
		nodeEnv.stderr.on('data', data => nLogger.error(data.toString().trim()));
		nodeEnv.on('message', message => {
			logger.info(message);
		});
		nodeEnv.on('close', () => {
			logger.info('closed');
			this.emit('dismissed', null);
		});
		nodeEnv.on('error', () => { logger.info('error'); });
		//	TODO: check message??
	}

	async dismiss() {
	}
}

/**
 * launches managed browsing environment and executes tests in it
 * - TODO: consider to separate auto-run
 * 
 * @param {string} sessionId 
 * @param {object} envConfig 
 * @returns environment
 */
async function launch(sessionId, envConfig) {
	if (!envConfig || !envConfig.node) {
		throw new Error(`env configuration expected to have node set to some value; got ${JSON.stringify(envConfig)}`);
	}

	const result = new NodeEnvImpl(sessionId, envConfig);
	await result.launch();
	return result;
}