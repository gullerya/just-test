/**
 * This will launch NodeJS environment, that is:
 * - spawning process/es as needed for encapsulated tests run
 * - running all tests in those processes
 * - collect results and shut down child processes
 * 
 * @param {Object} envConfig environment configuration
 * @param {string} envConfig.node in this context expected always to equal true
 */
import Logger, { FileOutput } from '../../logger/logger.js';
import { EnvironmentBase } from '../environment-base.js';
import { fork } from 'child_process';

export default launch;

const logger = new Logger({ context: 'NodeJS env service' });

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

		const verNamed = `node-${process.version.replace(/^[^0-9]+/, '')}`;
		this.consoleLogger = new FileOutput(`./reports/logs/${verNamed}.log`);
		const nLogger = new Logger({
			context: verNamed,
			outputs: [this.consoleLogger]
		});

		const nodeEnv = fork('bin/client/app.js', {
			stdio: 'pipe',
			timeout: this.envConfig.tests.ttl
		});
		nodeEnv.stdout.on('data', data => {
			nLogger.info(data.toString().trim());
		});
		nodeEnv.stderr.on('data', data => {
			nLogger.error(data.toString().trim());
		});
		nodeEnv.on('message', message => {
			logger.info(message);
		});
		nodeEnv.on('close', (...args) => {
			console.log(args);
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